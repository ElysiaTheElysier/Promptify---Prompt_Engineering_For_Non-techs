import type {IncomingMessage,ServerResponse} from 'node:http';
import {generateSavedRun} from './rebuildRunService.js';
import {AiServerError} from './apiServerService.js';
import {ApiAccessError,assertAiLessonAccess} from './apiAuthorizationService.js';
import {generationAsyncEnabled} from './generationQueueService';

/** TC-PLAY-02. Firebase Hosting buffers Cloud Run responses, so the browser calls this route on the Cloud Run URL
 * directly (CORS_ORIGINS allowlist). GENERATION_STREAM=true enables it; asynchronous generation keeps it off. */
export function generationStreamEnabled(){
 return process.env.GENERATION_STREAM==='true'&&process.env.RUNTIME_MODE!=='worker'&&process.env.RUNTIME_MODE!=='ai-worker'
  &&!generationAsyncEnabled()&&process.env.GENERATION_MODE!=='async'&&process.env.AI_WORKER_ISOLATED!=='true';
}
type Run=(authorization:string,body:any,queueOnly:boolean,onDelta:(text:string)=>void)=>Promise<any>;

/** Errors before the first token keep their HTTP status (the client may fall back); later errors arrive as an SSE
 * `error` event. A client disconnect never cancels the provider call: the Run still finishes and is saved once. */
export async function handleGenerationStream(req:IncomingMessage,res:ServerResponse,body:any,run:Run=generateSavedRun,access:typeof assertAiLessonAccess=assertAiLessonAccess){
 const authorization=typeof req.headers.authorization==='string'?req.headers.authorization:'';
 let opened=false,closed=false;
 res.on('close',()=>{closed=true;});
 const send=(event:string,data:unknown)=>{if(!closed&&!res.writableEnded)res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);};
 const open=()=>{
  if(opened)return;opened=true;
  res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'});
  res.flushHeaders?.();
 };
 const heartbeat=setInterval(()=>{if(opened&&!closed&&!res.writableEnded)res.write(': keepalive\n\n');},15000);
 heartbeat.unref?.();
 try{
  await access({authorization,classId:body?.classId,lessonId:body?.lessonId});
  const payload={classId:body.classId,lessonId:body.lessonId,requestId:body.requestId,prompt:typeof body.prompt==='string'?body.prompt:'',settings:body.settings,contextIds:body.contextIds,variableValues:body.variableValues};
  const result=await run(authorization,payload,false,text=>{if(!text)return;open();send('delta',{text});});
  if(opened){send('done',result);res.end();}
  else{res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(result));}
 }catch(error:any){
  const known=error instanceof ApiAccessError||error instanceof AiServerError;
  const status=known?error.statusCode:500,message=known?error.message:'Generation failed.',code=typeof error?.code==='string'?error.code:undefined;
  console.error(JSON.stringify({event:'api_failure',route:'stream',status,afterFirstToken:opened}));
  if(opened){send('error',{status,error:message,code});res.end();}
  else if(!res.headersSent){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify({error:message,code}));}
 }finally{clearInterval(heartbeat);}
}
