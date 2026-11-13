import {Firestore} from '@google-cloud/firestore';
import {sqlTransaction} from './cloudPostgresService';

// Trainer actions that change what learners of the class see; their open screens refetch on the notice.
export const LEARNER_NOTICE_ACTIONS=new Set(['saveStudio','createLesson','sessionControl','broadcast','privateHint','trainerAction','reviewHintRequest','publishSop','reviewSop','setAccess','revokeAccess','setAccessExpiry','reviewAccessRequest','unlockSupport','promoteLearner','syncSheet','saveLessonSlides','publishSlideVersion','setDefaultSlideDeck','removeSlideDeck','recordAttendance']);
const NOTICE_TIMEOUT_MS=3000,UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let firestore:Firestore|undefined,testSink:((uids:string[],classId:string)=>Promise<void>)|undefined;
export function configureClassNoticeForTests(sink:typeof testSink){if(process.env.NODE_ENV!=='test')throw Error('Class notice test injection requires NODE_ENV=test');testSink=sink;}

// Writes userUpdates/{firebaseUid}/classes/{classId} (rules: owner read only, no client writes). The notice carries no content:
// the learner's screen refetches through the authorized API. Failures never fail the trainer's action; polling still covers them.
export async function noticeClassChange(action:unknown,classId:unknown){
 if(typeof action!=='string'||!LEARNER_NOTICE_ACTIONS.has(action)||typeof classId!=='string'||!UUID.test(classId))return;
 if(process.env.NODE_ENV==='test'&&!testSink)return;
 try{
  const rows=await sqlTransaction(undefined,async db=>(await db.query(`SELECT DISTINCT b.external_subject FROM enrollments e JOIN learners l ON l.id=e.learner_id JOIN gcp_identity_bindings b ON b.user_id=l.user_id WHERE e.class_id=$1`,[classId])).rows) as Array<{external_subject:string}>;
  const uids=rows.map(r=>r.external_subject);if(!uids.length)return;
  if(testSink)return await testSink(uids,classId);
  firestore??=new Firestore();
  // shortcut: revision is wall-clock ms, so a later projection worker (outbox revisions) would be ignored; unify if that worker is enabled.
  const revision=Date.now(),write=(async()=>{for(let i=0;i<uids.length;i+=400){const batch=firestore!.batch();for(const uid of uids.slice(i,i+400))batch.set(firestore!.doc(`userUpdates/${uid}/classes/${classId}`),{revision,state:'changed',updatedAt:new Date()});await batch.commit();}})();
  await Promise.race([write,new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),NOTICE_TIMEOUT_MS))]);
 }catch(error){console.warn(JSON.stringify({event:'class_notice_failed',action,classId,error:(error as Error).message?.slice(0,200)}));}
}
