import {recordRequestTime} from './requestTimingService';
import {getApps,initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {createHash} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {sqlTransaction,type VerifiedActor} from './cloudPostgresService';
import {isLoadtestToken,loadtestIdentityEnabled,verifyLoadtestToken,LOADTEST_DATABASE} from './loadtestIdentityService';
export function firebaseAdmin(){return getApps()[0]||initializeApp({credential:applicationDefault(),projectId:process.env.GOOGLE_CLOUD_PROJECT});}
function legacyUuid(issuer:string,uid:string){const b=createHash('sha256').update(issuer+'\0'+uid).digest().subarray(0,16);b[6]=(b[6]&15)|128;b[8]=(b[8]&63)|128;const h=b.toString('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
let testVerifier:((token:string)=>Promise<VerifiedActor>)|undefined;
export function configureFirebaseVerifierForTests(verifier:(token:string)=>Promise<VerifiedActor>){if(process.env.NODE_ENV!=='test')throw Error('Identity test injection requires NODE_ENV=test');testVerifier=verifier;}
const requestIdentities=new AsyncLocalStorage<Map<string,Promise<VerifiedActor>>>();
/** One HTTP request verifies a token once (revocation check + binding) however many layers ask for it.
 * Nothing is shared between requests, so every new request still re-checks revocation. */
export function withRequestIdentity<T>(work:()=>Promise<T>):Promise<T>{return requestIdentities.run(new Map(),work);}
export function verifyFirebaseIdentity(token:string):Promise<VerifiedActor>{
 const memo=requestIdentities.getStore();
 if(!memo)return verifyIdentityOnce(token);
 let verified=memo.get(token);
 if(!verified){verified=verifyIdentityOnce(token);memo.set(token,verified);verified.catch(()=>memo.delete(token));}
 return verified;
}
/** Marks a definitive identity rejection (bad, expired or revoked token; identity policy). Anything unmarked
 * (Firebase or Cloud SQL unavailable, pool timeout) is transient: callers still deny, but with 503, not 401. */
const rejected=(error:unknown)=>Object.assign(error instanceof Error?error:Error(String(error)),{identityRejected:true});
export const isIdentityRejection=(error:unknown)=>(error as any)?.identityRejected===true;
/** TM-006: the revocation check is a Firebase network call per request. A verified token is reused for at most
 * REVOCATION_CACHE_MS (never past its own expiry), so a revoked token stays usable up to 60 s on an instance that already saw it.
 * shortcut: per-instance memory, bounded to 5000 tokens; move to a shared cache only if instances grow far beyond 10. */
export const REVOCATION_CACHE_MS=60000;
export const verifiedTokens=new Map<string,{claims:any;until:number}>();
export function rememberVerifiedToken(key:string,claims:any,now=Date.now()){
 if(verifiedTokens.size>=5000)for(const [k,v] of verifiedTokens)if(v.until<=now||verifiedTokens.size>=5000)verifiedTokens.delete(k);
 verifiedTokens.set(key,{claims,until:Math.min(now+REVOCATION_CACHE_MS,Number(claims?.exp)*1000||now)});
}
const TOKEN_REJECTIONS=new Set(['auth/id-token-expired','auth/id-token-revoked','auth/argument-error','auth/invalid-argument','auth/invalid-id-token','auth/user-disabled','auth/user-not-found']);
async function verifyIdentityOnce(token:string):Promise<VerifiedActor>{
 // Injected test verifiers model an unknown identity by throwing without a code; a coded error keeps its class.
 if(testVerifier)return testVerifier(token).catch(error=>{const code=(error as any)?.code;throw !code||TOKEN_REJECTIONS.has(code)?rejected(error):error;});
 if(!token)throw rejected('Authentication required');
 let identity:{uid:string;email:string;iss:string},synthetic=false;
 if(isLoadtestToken(token)){
  // Synthetic staging load tests only; never reaches Firebase, and is rejected on every other deployment.
  if(!loadtestIdentityEnabled())throw rejected('Verified Google identity required');
  synthetic=true;
  let lt;try{lt=verifyLoadtestToken(token);}catch(error){throw rejected(error);}
  identity={uid:lt.uid,email:lt.email,iss:lt.issuer};
 }else{
  const authStarted=performance.now();
  let google;
  const key=createHash('sha256').update(token).digest('base64url'),hit=verifiedTokens.get(key);
  if(hit&&hit.until>Date.now())google=hit.claims;
  else{
   try{google=await getAuth(firebaseAdmin()).verifyIdToken(token,true);}
   catch(error){const code=(error as any)?.code||(error as any)?.errorInfo?.code;throw TOKEN_REJECTIONS.has(code)?rejected(error):error;}
   rememberVerifiedToken(key,google);
  }
  recordRequestTime('auth',performance.now()-authStarted);
  if(google.uid.includes('/')||!google.email_verified||!google.email||google.firebase?.sign_in_provider!=='google.com')throw rejected('Verified Google identity required');
  identity={uid:google.uid,email:google.email,iss:google.iss};
 }
 return bindVerifiedIdentity(identity,synthetic);
}
/** TM-003: staff roles (admin / instructor / head) bind on first sign-in only after an administrator approves the request (026). */
export const IDENTITY_LINK_PENDING='identity_link_pending';
export async function bindVerifiedIdentity(identity:{uid:string;email:string;iss:string},synthetic=false):Promise<VerifiedActor>{
 const email=identity.email.toLowerCase(),issuer=identity.iss;
 const bound=await sqlTransaction(undefined,async db=>{
  // Defence in depth: whatever the env says, a synthetic identity only binds inside the load-test database.
  if(synthetic&&(await db.query('SELECT current_database() AS d')).rows[0]?.d!==LOADTEST_DATABASE)throw rejected('Load-test identity is only valid in the load-test database');
  const binding=(await db.query('SELECT b.user_id,b.legacy_subject,u.email FROM gcp_identity_bindings b JOIN users u ON u.id=b.user_id WHERE issuer=$1 AND external_subject=$2',[issuer,identity.uid])).rows[0];
  if(binding){if(binding.email.toLowerCase()!==email)throw rejected('Identity email changed; administrator review required');return {subject:binding.legacy_subject,email,firebaseUid:identity.uid,userId:binding.user_id};}
  const matches=(await db.query('SELECT id,auth_provider_id,role FROM users WHERE lower(email)=$1 FOR UPDATE',[email])).rows;
  if(matches.length>1)throw rejected('Ambiguous roster email; administrator review required');
  const user=matches[0];
  const old=user?.auth_provider_id;
  if(old&&!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(old))throw rejected('Legacy identity is invalid; administrator review required');
  const subject=old||legacyUuid(issuer,identity.uid);
  if(user&&!old&&user.role!=='learner'&&await approvalRequired(db,user,issuer,identity.uid)){
   // Saved before returning: throwing here would roll the request back with the transaction.
   await db.query(`INSERT INTO public.product_identity_link_requests(user_id,issuer,external_subject) VALUES($1,$2,$3)
    ON CONFLICT(user_id) DO UPDATE SET issuer=EXCLUDED.issuer,external_subject=EXCLUDED.external_subject,requested_at=now(),approved_at=NULL,approved_by=NULL`,[user.id,issuer,identity.uid]);
   console.log(JSON.stringify({event:'identity_link_pending',userId:user.id,role:user.role,issuer}));
   return null;
  }
  if(user){
   if(!old)await db.query('UPDATE users SET auth_provider_id=$1 WHERE id=$2',[subject,user.id]);
   const created=(await db.query('INSERT INTO gcp_identity_bindings(issuer,external_subject,user_id,legacy_subject) VALUES($1,$2,$3,$4) ON CONFLICT(issuer,external_subject) DO NOTHING RETURNING user_id',[issuer,identity.uid,user.id,subject])).rows.length>0;
   // TM-003 audit: first sign-in binds a Google account to a roster row by email. No email or token is logged.
   if(created)console.log(JSON.stringify({event:'identity_binding_created',userId:user.id,role:user.role,issuer,reusedSubject:!!old}));
  }
  return {subject,email,firebaseUid:identity.uid,userId:user?.id};
 });
 if(!bound)throw Object.assign(Error('Your staff account is waiting for an administrator to confirm this Google sign-in. Ask your L&D administrator to approve it in System governance, then sign in again.'),{statusCode:403,code:IDENTITY_LINK_PENDING});
 return bound;
}
async function approvalRequired(db:{query(sql:string,values?:any[]):Promise<{rows:any[]}>},user:{id:string;role:string},issuer:string,uid:string){
 // 026 not applied: previous behaviour (bind by email), logged so the gap is visible.
 if(!(await db.query("SELECT to_regclass('public.product_identity_link_requests') AS t")).rows[0]?.t){console.warn(JSON.stringify({event:'identity_link_approval_unavailable',userId:user.id}));return false;}
 // Bootstrap: the very first administrator binds without approval.
 if(user.role==='admin'&&!(await db.query("SELECT 1 FROM public.users WHERE role='admin' AND auth_provider_id IS NOT NULL LIMIT 1")).rows.length)return false;
 return !(await db.query('SELECT 1 FROM public.product_identity_link_requests WHERE user_id=$1 AND issuer=$2 AND external_subject=$3 AND approved_at IS NOT NULL',[user.id,issuer,uid])).rows.length;
}
/** Governance list of staff sign-ins waiting for approval (026); empty before the migration. */
export async function pendingIdentityLinks(){
 return sqlTransaction(undefined,async db=>{
  if(!(await db.query("SELECT to_regclass('public.product_identity_link_requests') AS t")).rows[0]?.t)return [];
  return (await db.query("SELECT r.user_id,u.email,u.full_name,u.role,r.requested_at FROM public.product_identity_link_requests r JOIN public.users u ON u.id=r.user_id WHERE r.approved_at IS NULL AND u.auth_provider_id IS NULL ORDER BY r.requested_at DESC LIMIT 50")).rows;
 });
}
