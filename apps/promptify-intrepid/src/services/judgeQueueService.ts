import {GoogleAuth} from 'google-auth-library';
import {createHash,randomBytes} from 'node:crypto';

// Asynchronous AI Judge dispatch (docs/proposals/JUDGE_ASYNC_PLAN_2026-10-22.md).
// Off unless JUDGE_MODE=async with a valid queue and worker URL; JUDGE_MODE=sync keeps the synchronous Judge.
const queuePattern=/^projects\/[a-z0-9-]+\/locations\/[a-z0-9-]+\/queues\/[A-Za-z0-9-]+$/;
export const JUDGE_JOB_DEADLINE_MS=270000;   // worker grading window inside Cloud Run's 300s request timeout
export const JUDGE_JOB_LEASE_SECONDS=290;
export const JUDGE_JOB_TTL_SECONDS=900;       // matches the queue's maxRetryDuration
export const JUDGE_MAX_DISPATCHES=3;          // matches the queue's maxAttempts

export function judgeAsyncEnabled(env=process.env){
 if(env.JUDGE_MODE!=='async'||!queuePattern.test(env.JUDGE_QUEUE||''))return false;
 try{const url=new URL(env.JUDGE_WORKER_URL||'');return url.protocol==='https:'&&url.pathname==='/'&&!url.search;}catch{return false;}
}
export function newJudgeToken(){const token=randomBytes(32).toString('hex');return {token,sha:judgeTokenSha(token)};}
export function judgeTokenSha(token:string){return createHash('sha256').update(token,'utf8').digest('hex');}

export type JudgeTask={attemptId:string;generation:number;token:string};
const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']});
/** Creates one Cloud Tasks HTTP task per job generation. The task name makes a repeated enqueue harmless. */
async function adcToken(){const client=await auth.getClient(),access=await client.getAccessToken();return access.token||'';}
export async function createJudgeTask(task:JudgeTask,env=process.env,request:typeof fetch=fetch,accessToken:()=>Promise<string>=adcToken){
 if(!judgeAsyncEnabled(env))throw Error('Judge queue is not configured');
 if(!/^[0-9a-f-]{36}$/i.test(task.attemptId)||!Number.isInteger(task.generation)||!/^[0-9a-f]{64}$/.test(task.token))throw Error('Invalid judge task');
 const queue=env.JUDGE_QUEUE!,worker=new URL('/internal/judge',env.JUDGE_WORKER_URL).toString();
 const token=await accessToken();
 if(!token)throw Error('Cloud Tasks credentials unavailable');
 const response=await request(`https://cloudtasks.googleapis.com/v2/${queue}/tasks`,{method:'POST',signal:AbortSignal.timeout(10000),
  headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
  body:JSON.stringify({task:{name:`${queue}/tasks/judge-${task.attemptId}-g${task.generation}`,dispatchDeadline:'300s',
   httpRequest:{httpMethod:'POST',url:worker,headers:{'Content-Type':'application/json','X-Promptify-Judge-Token':task.token},
    body:Buffer.from(JSON.stringify({attemptId:task.attemptId}),'utf8').toString('base64')}}})});
 // 409 ALREADY_EXISTS: this generation is already queued.
 if(!response.ok&&response.status!==409)throw Error('Cloud Tasks rejected the judge task (HTTP '+response.status+')');
}
