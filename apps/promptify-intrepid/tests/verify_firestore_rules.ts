import fs from 'node:fs';import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';import {doc,getDoc,setDoc} from 'firebase/firestore';
if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIRESTORE_EMULATOR_HOST.startsWith('127.0.0.1:'))throw Error('Rules tests require localhost Firestore emulator; never production');
const env=await initializeTestEnvironment({projectId:'demo-intrepid',firestore:{rules:fs.readFileSync('gcp/firestore.rules','utf8')}});
try{await env.withSecurityRulesDisabled(async ctx=>{await setDoc(doc(ctx.firestore(),'userUpdates/learner/classes/class-a'),{revision:1,state:'changed'});await setDoc(doc(ctx.firestore(),'private/secret'),{value:'private'});});
const learner=env.authenticatedContext('learner',{email_verified:true}).firestore(),other=env.authenticatedContext('other',{email_verified:true}).firestore(),anonymous=env.unauthenticatedContext().firestore(),unverified=env.authenticatedContext('learner',{email_verified:false}).firestore();
await assertSucceeds(getDoc(doc(learner,'userUpdates/learner/classes/class-a')));
await assertFails(getDoc(doc(other,'userUpdates/learner/classes/class-a')));
await assertFails(getDoc(doc(anonymous,'userUpdates/learner/classes/class-a')));
await assertFails(getDoc(doc(unverified,'userUpdates/learner/classes/class-a')));
await assertFails(setDoc(doc(learner,'userUpdates/learner/classes/class-a'),{revision:999}));
await assertFails(getDoc(doc(learner,'private/secret')));
console.log('Firestore rules PASS: own verified-user invalidation read; cross-user/anonymous/unverified reads and all client writes denied. Emulator only.');
}finally{await env.cleanup();}
