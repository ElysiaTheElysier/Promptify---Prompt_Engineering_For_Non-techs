import {createHmac,timingSafeEqual} from 'node:crypto';
import {providerStubEnabled,assertProviderStubAllowed} from './providerStubService';

/** STAGING LOAD TESTS ONLY: synthetic learners sign requests with `lt1.<uid>.<exp>.<hmac>` instead of a Google sign-in.
 * Accepted only on a service that runs the provider stub (staging project + ack), against the dedicated
 * `promptify_loadtest` database, with LOADTEST_IDENTITY_SECRET (>= 32 chars) set. Anywhere else such tokens are
 * rejected before any Firebase call. uids are `loadtest-NNN`, emails `<uid>@loadtest.invalid`, lifetime <= 3 h. */
export const LOADTEST_DATABASE='promptify_loadtest';
export const LOADTEST_ISSUER='https://loadtest.promptify.invalid';
const MAX_LIFETIME_S=3*3600;
export function loadtestIdentityEnabled(env=process.env){
 if((env.LOADTEST_IDENTITY_SECRET||'').length<32||!providerStubEnabled(env))return false;
 if(env.NODE_ENV!=='test'&&env.PGDATABASE!==LOADTEST_DATABASE)return false;
 try{assertProviderStubAllowed(env);return true;}catch{return false;}
}
const sign=(secret:string,uid:string,exp:number)=>createHmac('sha256',secret).update(`lt1.${uid}.${exp}`).digest('hex');
export function mintLoadtestToken(secret:string,uid:string,expSeconds:number){
 if(!/^loadtest-\d{1,4}$/.test(uid))throw Error('Invalid load-test uid');
 return `lt1.${uid}.${expSeconds}.${sign(secret,uid,expSeconds)}`;
}
export const isLoadtestToken=(token:string)=>token.startsWith('lt1.');
/** Returns the synthetic identity, or throws. Callers must first check loadtestIdentityEnabled(). */
export function verifyLoadtestToken(token:string,env=process.env,nowSeconds=Math.floor(Date.now()/1000)){
 const secret=env.LOADTEST_IDENTITY_SECRET||'';
 const m=/^lt1\.(loadtest-\d{1,4})\.(\d{10})\.([0-9a-f]{64})$/.exec(token);
 if(!m||secret.length<32)throw Error('Invalid load-test token');
 const [,uid,expText,mac]=m,exp=Number(expText);
 const expected=Buffer.from(sign(secret,uid,exp),'hex'),given=Buffer.from(mac,'hex');
 if(expected.length!==given.length||!timingSafeEqual(expected,given))throw Error('Invalid load-test token');
 if(exp<=nowSeconds||exp>nowSeconds+MAX_LIFETIME_S)throw Error('Expired load-test token');
 return {uid,email:`${uid}@loadtest.invalid`,issuer:LOADTEST_ISSUER};
}
