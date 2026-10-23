import {GoogleAuth} from 'google-auth-library';
import {createHash,randomBytes} from 'node:crypto';
export const GENERATION_LEASE_SECONDS=290;
export const GENERATION_TTL_SECONDS=900;
export type GenerationTask={subject:string;requestId:string;generation:number;token:string};
export function generationAsyncEnabled(env=process.env){
 if(env.GENERATION_MODE!=='async'||!/^projects\/[a-z0-9-]+\/locations\/[a-z0-9-]+\/queues\/[A-Za-z0-9-]+$/.test(env.GENERATION_QUEUE||''))return false;
 try{const url=new URL(env.GENERATION_WORKER_URL||'');return url.protocol==='https:'&&url.pathname==='/'&&!url.search;}catch{return false;}
}
export const generationTokenSha=(token:string)=>createHash('sha256').update(token,'utf8').digest('hex');
export function newGenerationToken(){const token=randomBytes(32).toString('hex');return {token,sha:generationTokenSha(token)};}
const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']});
async function adcToken(){const client=await auth.getClient();return (await client.getAccessToken()).token||'';}
export async function createGenerationTask(task:GenerationTask,env=process.env,request:typeof fetch=fetch,accessToken=adcToken){
 if(!generationAsyncEnabled(env))throw Error('Generation queue is not configured');
 if(!/^[0-9a-f-]{36}$/i.test(task.subject)||!/^[0-9a-f-]{36}$/i.test(task.requestId)||!Number.isInteger(task.generation)||task.generation<1||!/^[0-9a-f]{64}$/.test(task.token))throw Error('Invalid generation task');
 const token=await accessToken();if(!token)throw Error('Cloud Tasks credentials unavailable');
 const queue=env.GENERATION_QUEUE!;
 const response=await request(`https://cloudtasks.googleapis.com/v2/${queue}/tasks`,{method:'POST',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({task:{name:`${queue}/tasks/generation-${task.subject}-${task.requestId}-g${task.generation}`,dispatchDeadline:'300s',httpRequest:{httpMethod:'POST',url:new URL('/internal/generation',env.GENERATION_WORKER_URL).toString(),headers:{'Content-Type':'application/json','X-Promptify-Generation-Token':task.token},body:Buffer.from(JSON.stringify({subject:task.subject,requestId:task.requestId})).toString('base64')}}})});
 if(!response.ok&&response.status!==409)throw Error('Cloud Tasks rejected generation task (HTTP '+response.status+')');
}
