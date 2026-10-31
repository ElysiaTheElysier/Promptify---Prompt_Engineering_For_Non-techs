import {recordRequestTime} from './requestTimingService';
import {getApps,initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {createHash} from 'node:crypto';
import {sqlTransaction,type VerifiedActor} from './cloudPostgresService';
export function firebaseAdmin(){return getApps()[0]||initializeApp({credential:applicationDefault(),projectId:process.env.GOOGLE_CLOUD_PROJECT});}
function legacyUuid(issuer:string,uid:string){const b=createHash('sha256').update(issuer+'\0'+uid).digest().subarray(0,16);b[6]=(b[6]&15)|128;b[8]=(b[8]&63)|128;const h=b.toString('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
let testVerifier:((token:string)=>Promise<VerifiedActor>)|undefined;
export function configureFirebaseVerifierForTests(verifier:(token:string)=>Promise<VerifiedActor>){if(process.env.NODE_ENV!=='test')throw Error('Identity test injection requires NODE_ENV=test');testVerifier=verifier;}
/** Marks a definitive identity rejection (bad, expired or revoked token; identity policy). Anything unmarked
 * (Firebase or Cloud SQL unavailable, pool timeout) is transient: callers still deny, but with 503, not 401. */
const rejected=(error:unknown)=>Object.assign(error instanceof Error?error:Error(String(error)),{identityRejected:true});
export const isIdentityRejection=(error:unknown)=>(error as any)?.identityRejected===true;
const TOKEN_REJECTIONS=new Set(['auth/id-token-expired','auth/id-token-revoked','auth/argument-error','auth/invalid-argument','auth/invalid-id-token','auth/user-disabled','auth/user-not-found']);
export async function verifyFirebaseIdentity(token:string):Promise<VerifiedActor>{
 // Injected test verifiers model an unknown identity by throwing without a code; a coded error keeps its class.
 if(testVerifier)return testVerifier(token).catch(error=>{const code=(error as any)?.code;throw !code||TOKEN_REJECTIONS.has(code)?rejected(error):error;});
 if(!token)throw rejected('Authentication required');
 const authStarted=performance.now();
 let identity;
 try{identity=await getAuth(firebaseAdmin()).verifyIdToken(token,true);}
 catch(error){const code=(error as any)?.code||(error as any)?.errorInfo?.code;throw TOKEN_REJECTIONS.has(code)?rejected(error):error;}
 recordRequestTime('auth',performance.now()-authStarted);
 if(identity.uid.includes('/')||!identity.email_verified||!identity.email||identity.firebase?.sign_in_provider!=='google.com')throw rejected('Verified Google identity required');
 const email=identity.email.toLowerCase(),issuer=identity.iss;
 return sqlTransaction(undefined,async db=>{
  const binding=(await db.query('SELECT b.user_id,b.legacy_subject,u.email FROM gcp_identity_bindings b JOIN users u ON u.id=b.user_id WHERE issuer=$1 AND external_subject=$2',[issuer,identity.uid])).rows[0];
  if(binding){if(binding.email.toLowerCase()!==email)throw rejected('Identity email changed; administrator review required');return {subject:binding.legacy_subject,email,firebaseUid:identity.uid,userId:binding.user_id};}
  const matches=(await db.query('SELECT id,auth_provider_id,role FROM users WHERE lower(email)=$1 FOR UPDATE',[email])).rows;
  if(matches.length>1)throw rejected('Ambiguous roster email; administrator review required');
  const user=matches[0];
  const old=user?.auth_provider_id;
  if(old&&!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(old))throw rejected('Legacy identity is invalid; administrator review required');
  const subject=old||legacyUuid(issuer,identity.uid);
  if(user){
   if(!old)await db.query('UPDATE users SET auth_provider_id=$1 WHERE id=$2',[subject,user.id]);
   const created=(await db.query('INSERT INTO gcp_identity_bindings(issuer,external_subject,user_id,legacy_subject) VALUES($1,$2,$3,$4) ON CONFLICT(issuer,external_subject) DO NOTHING RETURNING user_id',[issuer,identity.uid,user.id,subject])).rows.length>0;
   // TM-003 audit: first sign-in binds a Google account to a roster row by email. No email or token is logged.
   if(created)console.log(JSON.stringify({event:'identity_binding_created',userId:user.id,role:user.role,issuer,reusedSubject:!!old}));
  }
  return {subject,email,firebaseUid:identity.uid,userId:user?.id};
 });
}
