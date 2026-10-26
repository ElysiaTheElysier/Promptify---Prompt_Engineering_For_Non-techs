import type {IncomingMessage,ServerResponse} from 'node:http';
import {evaluateSavedRun,enqueueJudge,watchJudge} from './rebuildRunService.js';
import {AiServerError} from './apiServerService.js';
import {ApiAccessError,assertAiLessonAccess} from './apiAuthorizationService.js';
import {judgeAsyncEnabled} from './judgeQueueService';
import {withRequestIdentity} from './firebaseServerIdentityService';

/** On-demand AI Judge with per-criterion streaming, on the Cloud Run URL like /api/stream (Hosting buffers responses).
 * JUDGE_STREAM=true. With JUDGE_MODE=async the durable queue still grades; this route only enqueues (or resumes)
 * and forwards each criterion as the worker stores it. A misconfigured async Judge keeps the route off. */
export function judgeStreamEnabled(){
 if(process.env.JUDGE_STREAM!=='true'||process.env.RUNTIME_MODE==='worker'||process.env.RUNTIME_MODE==='ai-worker')return false;
 return judgeAsyncEnabled()||process.env.JUDGE_MODE!=='async'&&process.env.AI_WORKER_ISOLATED!=='true';
}
type Deps={
 async:boolean;
 evaluate:(authorization:string,body:any,onCriterion:(row:unknown)=>void)=>Promise<any>;
 enqueue:(authorization:string,body:any)=>Promise<any>;
 watch:typeof watchJudge;
 access:typeof assertAiLessonAccess;
};
const defaults=():Deps=>({async:judgeAsyncEnabled(),evaluate:evaluateSavedRun,enqueue:enqueueJudge,watch:watchJudge,access:assertAiLessonAccess});
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** Events: `status` (queued|running|retry_wait), `progress` ({graded}: count only, may precede the verdict),
 * `criterion` (provisional row with score, only after the verdict), then exactly one of `done` (saved
 * weighted-v1 grade), `resume` (watch window ended; the client keeps polling) or `error`. `resume:true` only watches
 * an existing job and never enqueues, so a reconnect cannot start or charge a new grade. A disconnect never cancels grading. */
export function handleJudgeStream(req:IncomingMessage,res:ServerResponse,body:any,deps:Partial<Deps>={}){
 // Access check, enqueue and watch each resolve the caller; verify the token once for the whole stream.
 return withRequestIdentity(()=>streamJudge(req,res,body,deps));
}
async function streamJudge(req:IncomingMessage,res:ServerResponse,body:any,deps:Partial<Deps>){
 const {async,evaluate,enqueue,watch,access}={...defaults(),...deps};
 const authorization=typeof req.headers.authorization==='string'?req.headers.authorization:'';
 const abort=new AbortController();
 res.on('close',()=>abort.abort());
 const open=()=>{if(res.headersSent)return;res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'});res.flushHeaders?.();};
 // The stream opens with its first event, so a denial found before that (e.g. resume ownership) keeps its HTTP status.
 const send=(event:string,data:unknown)=>{if(abort.signal.aborted||res.writableEnded)return;open();res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);};
 const heartbeat=setInterval(()=>{if(!abort.signal.aborted&&!res.writableEnded&&res.headersSent)res.write(': keepalive\n\n');},15000);
 heartbeat.unref?.();
 try{
  if(![body?.classId,body?.lessonId,body?.attemptId].every(id=>typeof id==='string'&&uuid.test(id)))throw new ApiAccessError('Invalid request.',400);
  await access({authorization,classId:body.classId,lessonId:body.lessonId});
  const target={classId:body.classId,lessonId:body.lessonId,attemptId:body.attemptId,language:body.language==='en'?'en':'vi'};
  if(!async){
   // Opened after authorization so denials keep their HTTP status and the client can fall back.
   if(body.resume===true)throw new ApiAccessError('Nothing to resume.',404);
   open();
   send('done',await evaluate(authorization,target,row=>send('criterion',row)));res.end();return;
  }
  let started:any;
  if(body.resume!==true){
   // Budget, busy and queue errors happen here and keep their HTTP status.
   started=await enqueue(authorization,target);
   if(!started?.async){open();send('done',started);res.end();return;}
  }
  let lastStatus='';
  const sendStatus=(value:string)=>{if(value!==lastStatus){lastStatus=value;send('status',{status:value});}};
  // The job exists now: say so before the first status read.
  if(started?.status)sendStatus(started.status);
  const state:any=await watch(authorization,target,{onCriterion:row=>send('criterion',row),onStatus:sendStatus,onProgress:graded=>send('progress',{graded}),signal:abort.signal,owned:!!started?.async});
  if(state.status==='succeeded')send('done',state.evaluation);
  else if(state.status==='watching'||abort.signal.aborted)send('resume',{});
  else send('error',{status:409,judgeStatus:state.status,errorCode:state.errorCode,error:'AI Judge did not finish.'});
  res.end();
 }catch(error:any){
  const known=error instanceof ApiAccessError||error instanceof AiServerError;
  const status=known?error.statusCode:500,message=known?error.message:'AI Judge failed.';
  console.error(JSON.stringify({event:'api_failure',route:'judge-stream',status,opened:res.headersSent}));
  if(res.headersSent){send('error',{status,error:message});res.end();}
  else{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify({error:message}));}
 }finally{clearInterval(heartbeat);}
}
