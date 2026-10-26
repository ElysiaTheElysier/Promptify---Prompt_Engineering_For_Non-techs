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
async function verifyIdentityOnce(token:string):Promise<VerifiedActor>{
 if(testVerifier)return testVerifier(token);
 if(!token)throw Error('Authentication required');
 let identity:{uid:string;email:string;iss:string},synthetic=false;
 if(isLoadtestToken(token)){
  // Synthetic staging load tests only; never reaches Firebase, and is rejected on every other deployment.
  if(!loadtestIdentityEnabled())throw Error('Verified Google identity required');
  synthetic=true;
  const lt=verifyLoadtestToken(token);identity={uid:lt.uid,email:lt.email,iss:lt.issuer};
 }else{
  const authStarted=performance.now();
  const google=await getAuth(firebaseAdmin()).verifyIdToken(token,true);
  recordRequestTime('auth',performance.now()-authStarted);
  if(google.uid.includes('/')||!google.email_verified||!google.email||google.firebase?.sign_in_provider!=='google.com')throw Error('Verified Google identity required');
  identity={uid:google.uid,email:google.email,iss:google.iss};
 }
 const email=identity.email.toLowerCase(),issuer=identity.iss;
 return sqlTransaction(undefined,async db=>{
  // Defence in depth: whatever the env says, a synthetic identity only binds inside the load-test database.
  if(synthetic&&(await db.query('SELECT current_database() AS d')).rows[0]?.d!==LOADTEST_DATABASE)throw Error('Load-test identity is only valid in the load-test database');
  const binding=(await db.query('SELECT b.user_id,b.legacy_subject,u.email FROM gcp_identity_bindings b JOIN users u ON u.id=b.user_id WHERE issuer=$1 AND external_subject=$2',[issuer,identity.uid])).rows[0];
  if(binding){if(binding.email.toLowerCase()!==email)throw Error('Identity email changed; administrator review required');return {subject:binding.legacy_subject,email,firebaseUid:identity.uid,userId:binding.user_id};}
  const matches=(await db.query('SELECT id,auth_provider_id FROM users WHERE lower(email)=$1 FOR UPDATE',[email])).rows;
  if(matches.length>1)throw Error('Ambiguous roster email; administrator review required');
  const user=matches[0];
  const old=user?.auth_provider_id;
  if(old&&!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(old))throw Error('Legacy identity is invalid; administrator review required');
  const subject=old||legacyUuid(issuer,identity.uid);
  if(user){
   if(!old)await db.query('UPDATE users SET auth_provider_id=$1 WHERE id=$2',[subject,user.id]);
   await db.query('INSERT INTO gcp_identity_bindings(issuer,external_subject,user_id,legacy_subject) VALUES($1,$2,$3,$4) ON CONFLICT(issuer,external_subject) DO NOTHING',[issuer,identity.uid,user.id,subject]);
  }
  return {subject,email,firebaseUid:identity.uid,userId:user?.id};
 });
}
