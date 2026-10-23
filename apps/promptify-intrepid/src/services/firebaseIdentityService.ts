import {getApps,initializeApp} from 'firebase/app';
import {getAuth,onIdTokenChanged,GoogleAuthProvider,signInWithPopup,signOut,connectAuthEmulator,type User} from 'firebase/auth';
import {getFirestore,doc,onSnapshot,connectFirestoreEmulator} from 'firebase/firestore';
export type FirebaseSession={access_token:string;user:{id:string;email?:string}};
const env=import.meta.env||{};
export const isFirebaseConfigured=Boolean(env.VITE_FIREBASE_PROJECT_ID&&env.VITE_FIREBASE_API_KEY&&env.VITE_FIREBASE_AUTH_DOMAIN);
const app=isFirebaseConfigured?(getApps()[0]||initializeApp({apiKey:env.VITE_FIREBASE_API_KEY,authDomain:env.VITE_FIREBASE_AUTH_DOMAIN,projectId:env.VITE_FIREBASE_PROJECT_ID,appId:env.VITE_FIREBASE_APP_ID})):undefined;
const auth=app?getAuth(app):undefined;
if(auth&&env.DEV&&env.VITE_FIREBASE_AUTH_EMULATOR)connectAuthEmulator(auth,env.VITE_FIREBASE_AUTH_EMULATOR,{disableWarnings:true});
const firestore=app?getFirestore(app):undefined;
if(firestore&&env.DEV&&env.VITE_FIRESTORE_EMULATOR){const [host,port]=env.VITE_FIRESTORE_EMULATOR.split(':');connectFirestoreEmulator(firestore,host,Number(port));}
async function session(user:User|null):Promise<FirebaseSession|null>{return user?{access_token:await user.getIdToken(),user:{id:user.uid,email:user.email||undefined}}:null;}
export const identity={auth:{
 async getSession(){if(auth)await auth.authStateReady();return {data:{session:await session(auth?.currentUser||null)},error:null};},
 onAuthStateChange(callback:(event:string,value:FirebaseSession|null)=>void){let active=true;const stop=auth?onIdTokenChanged(auth,user=>{void session(user).then(value=>{if(active)callback(value?'SIGNED_IN':'SIGNED_OUT',value);}).catch(()=>{if(active)callback('SIGNED_OUT',null);});}):()=>{};return {data:{subscription:{unsubscribe(){active=false;stop();}}}};},
 async signInWithOAuth(options:{provider:string;options?:{redirectTo?:string;queryParams?:Record<string,string>}}){try{if(!auth)throw Error('Firebase sign-in is not configured');if(options.provider!=='google')throw Error('Only Google sign-in is supported');const provider=new GoogleAuthProvider();provider.setCustomParameters({...options.options?.queryParams,prompt:'select_account'});await signInWithPopup(auth,provider);if(options.options?.redirectTo){const target=new URL(options.options.redirectTo,location.origin);if(target.origin!==location.origin)throw Error('Invalid sign-in redirect');location.assign(target.href);}return {error:null};}catch(error){return {error:error as Error};}},
 async signOut(_options?:unknown){if(auth)await signOut(auth);return {error:null};}
},storage:{from:(bucket:string)=>({async uploadToSignedUrl(_path:string,url:string,file:File,options:{contentType?:string}={}){try{if(bucket!=='product-sop-originals')throw Error('Invalid upload bucket');const target=new URL(url);if(target.protocol!=='https:'||target.hostname!=='storage.googleapis.com')throw Error('Invalid signed upload origin');const response=await fetch(url,{method:'PUT',headers:{'Content-Type':options.contentType||'application/octet-stream','x-goog-if-generation-match':'0'},body:file});if(!response.ok)throw Error('Private upload failed');return {error:null};}catch(error){return {error};}}})}};
/** Firestore carries only invalidation notices; all sensitive data is reloaded through the authorized API. */
export function subscribeClassUpdates(classId:string,callback:()=>void){const uid=auth?.currentUser?.uid;if(!firestore||!uid)return ()=>{};return onSnapshot(doc(firestore,'userUpdates',uid,'classes',classId),()=>callback(),()=>{/* Authorized API polling remains available. */});}
