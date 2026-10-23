import {generationAsyncEnabled} from './generationQueueService';
import {createServer,type IncomingMessage,type ServerResponse,type Server} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import product from '../../api/product';
import generate from '../../api/generate';
import evaluate from '../../api/evaluate';
import rosterCompatibility from '../../api/roster-worker';
import {runRosterWorker,runStagingRosterWorker} from './rosterWorkerService';
import {runProjectionWorker} from './cloudProjectionService';
import {judgeAsyncEnabled} from './judgeQueueService';
import {runJudgeJob,runGenerationJob} from './rebuildRunService';
import {generationStreamEnabled,handleGenerationStream} from './generationStreamService';
import {getSqlPool,closeSqlPool} from './cloudPostgresService';
import {OAuth2Client} from 'google-auth-library';

const oauth=new OAuth2Client();
type WorkerIdentityPayload={aud?:string|string[];email?:string;email_verified?:boolean;iss?:string};
type WorkerIdentityVerifier=(token:string,audience:string)=>Promise<WorkerIdentityPayload|undefined>;
let verifyWorkerIdentity:WorkerIdentityVerifier=async(token,audience)=>{
 const ticket=await oauth.verifyIdToken({idToken:token,audience});
 return ticket.getPayload();
};

export function configureWorkerIdentityVerifierForTests(verifier?:WorkerIdentityVerifier){
 if(process.env.NODE_ENV!=='test')throw Error('Worker identity verifier injection requires NODE_ENV=test');
 verifyWorkerIdentity=verifier|| (async(token,audience)=>{
  const ticket=await oauth.verifyIdToken({idToken:token,audience});
  return ticket.getPayload();
 });
}

export async function workerAuthorized(header:string|undefined){
 const audience=process.env.WORKER_AUDIENCE,email=process.env.WORKER_INVOKER_EMAIL;if(!audience||!email||!header?.startsWith('Bearer '))return false;
 try{const p=await verifyWorkerIdentity(header.slice(7),audience);const exactAudience=p?.aud===audience||(Array.isArray(p?.aud)&&p.aud.includes(audience));return exactAudience&&p?.email===email&&p.email_verified===true&&typeof p.iss==='string'&&['accounts.google.com','https://accounts.google.com'].includes(p.iss);}catch{return false;}
}

const stagingProject='ai-transformation-510302';
const stagingSchedulerEmail=`promptify-scheduler@${stagingProject}.iam.gserviceaccount.com`;
export function stagingRosterRouteEnabled(){
 const audience=process.env.WORKER_AUDIENCE;
 let validAudience=false;
 try{validAudience=!!audience&&new URL(audience).protocol==='https:'&&new URL(audience).hostname.endsWith('.run.app');}catch{}
 return process.env.RUNTIME_MODE==='api'&&process.env.ROSTER_STAGING_ENABLED==='true'
  &&process.env.GOOGLE_CLOUD_PROJECT===stagingProject&&process.env.K_SERVICE==='promptify-intrepid-api'
  &&process.env.WORKER_INVOKER_EMAIL===stagingSchedulerEmail&&validAudience;
}

function json(res:ServerResponse,status:number,body:unknown){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}

function logEvent(event:string,details?:Record<string,unknown>){
 console.log(JSON.stringify({event,...details}));
}

export async function cloudHandler(req:IncomingMessage,res:ServerResponse){
 const url=new URL(req.url||'/', 'http://localhost');
 if(url.pathname==='/health'||url.pathname==='/healthz'){json(res,200,{status:'ok'});return;}
 if(url.pathname==='/readyz'){try{const db=await getSqlPool().connect();try{await db.query('SELECT 1');}finally{db.release?.();}json(res,200,{status:'ready'});}catch{json(res,503,{status:'not_ready'});}return;}

 const originHeader=req.headers.origin;
 const origin=Array.isArray(originHeader)?originHeader[0]:originHeader;
 const corsEnv=process.env.CORS_ORIGINS;
 let allowedOrigins:string[]|undefined;

 if(corsEnv!==undefined&&corsEnv.trim()!==''){
  allowedOrigins=corsEnv.split(',').map(s=>s.trim()).filter(Boolean);
 }

 if(allowedOrigins!==undefined){
  if(origin){
   if(!allowedOrigins.includes(origin)){
    json(res,403,{error:'Origin not allowed'});
    return;
   }
   res.setHeader('Access-Control-Allow-Origin',origin);
   res.setHeader('Vary','Origin');
  }
 }

 if(req.method==='OPTIONS'&&url.pathname.startsWith('/api/')){
  if(allowedOrigins!==undefined&&origin&&allowedOrigins.includes(origin)){
   res.writeHead(204,{
    'Access-Control-Allow-Origin':origin,
    'Access-Control-Allow-Methods':'POST',
    'Access-Control-Allow-Headers':'Content-Type, Authorization',
    'Vary':'Origin'
   });
   res.end();
   return;
  }
 }

 if(url.pathname.startsWith('/internal/')){
  // AI workers can run in a dedicated existing Cloud Run service. The API rejects these when isolated.
  if((process.env.RUNTIME_MODE==='ai-worker'||process.env.RUNTIME_MODE==='api'&&process.env.AI_WORKER_ISOLATED!=='true')&&url.pathname==='/internal/generation'&&generationAsyncEnabled()){
   if(req.method!=='POST'){json(res,405,{error:'POST required'});return;}
   const token=req.headers['x-promptify-generation-token'];let bytes=0;const chunks:Buffer[]=[];
   try{for await(const chunk of req){bytes+=chunk.length;if(bytes>4096){json(res,413,{error:'Request too large'});return;}chunks.push(Buffer.from(chunk));}
    const body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
    const result=await runGenerationJob(typeof token==='string'?token:'',typeof body.subject==='string'?body.subject:'',typeof body.requestId==='string'?body.requestId:'');
    logEvent('generation_job',{status:result.status,http:result.http});json(res,result.http,{status:result.status});
   }catch{logEvent('request_failed',{status:503,path:'/internal/generation'});if(!res.headersSent)json(res,503,{error:'Generation worker failed'});}
   return;
  }
  // Async AI Judge worker, reached by Cloud Tasks only; each request carries its job's own token.
  if((process.env.RUNTIME_MODE==='ai-worker'||process.env.RUNTIME_MODE==='api'&&process.env.AI_WORKER_ISOLATED!=='true')&&url.pathname==='/internal/judge'&&judgeAsyncEnabled()){
   if(req.method!=='POST'){json(res,405,{error:'POST required'});return;}
   const token=req.headers['x-promptify-judge-token'];
   let bytes=0;const chunks:Buffer[]=[];
   try{for await(const chunk of req){bytes+=chunk.length;if(bytes>4096){json(res,413,{error:'Request too large'});return;}chunks.push(Buffer.from(chunk));}
    const body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
    const result=await runJudgeJob(typeof token==='string'?token:'',typeof body?.attemptId==='string'?body.attemptId:'');
    logEvent('judge_job',{status:result.status,http:result.http});
    json(res,result.http,{status:result.status});
   }catch{logEvent('request_failed',{status:503,path:'/internal/judge'});if(!res.headersSent)json(res,503,{error:'Judge worker failed'});}
   return;
  }
  if(process.env.RUNTIME_MODE==='api'&&url.pathname==='/internal/roster'&&stagingRosterRouteEnabled()){
   if(req.method!=='POST'){json(res,405,{error:'POST required'});return;}
   if(!await workerAuthorized(req.headers.authorization)){json(res,401,{error:'Unauthorized'});return;}
   try{json(res,200,await runStagingRosterWorker());}
   catch{logEvent('request_failed',{status:503,path:'/internal/roster'});json(res,503,{error:'Worker operation failed'});}
   return;
  }
  if(process.env.RUNTIME_MODE!=='worker'){json(res,404,{error:'Not found'});return;}
  if(req.method!=='POST'){json(res,405,{error:'POST required'});return;}
  if(!await workerAuthorized(req.headers.authorization)){json(res,401,{error:'Unauthorized'});return;}
  try{if(url.pathname==='/internal/roster'){const {randomUUID}=await import('node:crypto');json(res,200,await runRosterWorker(randomUUID()));}
   else if(url.pathname==='/internal/projections')json(res,200,await runProjectionWorker());else json(res,404,{error:'Not found'});
  }catch{logEvent('request_failed',{status:503,path:'/internal'});json(res,503,{error:'Worker operation failed'});}
  return;
 }
 if(['worker','ai-worker'].includes(process.env.RUNTIME_MODE||'')){json(res,404,{error:'Not found'});return;}
 // TC-PLAY-02: token streaming, reached directly on the Cloud Run URL because Hosting buffers responses.
 if(url.pathname==='/api/stream'){
  if(!generationStreamEnabled()){json(res,404,{error:'Not found'});return;}
  if(req.method!=='POST'){json(res,405,{error:'POST required'});return;}
  let bytes=0,body:any;const chunks:Buffer[]=[];
  try{for await(const chunk of req){bytes+=chunk.length;if(bytes>3000000){json(res,413,{error:'Request too large'});return;}chunks.push(Buffer.from(chunk));}
   body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
  }catch{json(res,400,{error:'Invalid request'});return;}
  await handleGenerationStream(req,res,body);return;
 }
 if(url.pathname.startsWith('/api/')){
  const handlers:Record<string,typeof product>={'/api/product':product,'/api/generate':generate,'/api/evaluate':evaluate,'/api/roster-worker':rosterCompatibility};
  const handler=handlers[url.pathname];
  if(!handler){json(res,404,{error:'Not found'});return;}
  if(req.method!=='POST'){json(res,405,{error:'POST required'});return;}
  let bytes=0;const chunks:Buffer[]=[];
  try{for await(const chunk of req){bytes+=chunk.length;if(bytes>3000000){json(res,413,{error:'Request too large'});return;}chunks.push(Buffer.from(chunk));}
   let status=200;const adapter={setHeader:(name:string,value:string)=>res.setHeader(name,value),status:(code:number)=>{status=code;return adapter;},json:(body:unknown)=>json(res,status,body)};
   await handler({method:req.method,headers:req.headers,body:Buffer.concat(chunks).toString('utf8')},adapter);
  }catch{
   if(!res.headersSent){
    logEvent('request_failed',{status:400,path:'/api'});
    json(res,400,{error:'Invalid request'});
   }
  }return;
 }
 try{const publicRoot=path.resolve('dist');const requested=path.resolve(publicRoot,'.'+decodeURIComponent(url.pathname));if(requested!==publicRoot&&!requested.startsWith(publicRoot+path.sep)){json(res,404,{error:'Not found'});return;}
  let filename=requested;try{if(!path.extname(filename))filename=path.join(publicRoot,'index.html');const data=await readFile(filename);const extension=path.extname(filename),types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.ttf':'font/ttf','.svg':'image/svg+xml','.json':'application/json'};res.writeHead(200,{'Content-Type':types[extension]||'application/octet-stream','Cache-Control':extension==='.html'?'no-store':'public,max-age=3600','X-Content-Type-Options':'nosniff'});res.end(data);}catch{json(res,404,{error:'Not found'});}
 }catch{
  logEvent('request_failed',{status:400,path:'static'});
  json(res,400,{error:'Invalid path'});
 }
}

export function startCloudServer():Server{
 if(process.env.NODE_ENV==='production'&&(process.env.FIREBASE_AUTH_EMULATOR_HOST||process.env.FIRESTORE_EMULATOR_HOST))throw Error('Production cannot use Firebase emulators');

 const rawPort=process.env.PORT||'8080';
 const port=Number(rawPort);
 const isTest=process.env.NODE_ENV==='test';
 if(!Number.isInteger(port)||(isTest?(port<0||port>65535):(port<1||port>65535))){
  throw Error('Invalid PORT');
 }

 const server=createServer((req,res)=>{
  void cloudHandler(req,res).catch(()=>{
   if(!res.headersSent){
    logEvent('request_failed',{status:500});
    json(res,500,{error:'Request failed'});
   }
  });
 });

 server.requestTimeout=60000;
 server.headersTimeout=65000;

 let isShuttingDown=false;
 const handleShutdown=(signal:string)=>{
  if(isShuttingDown)return;
  isShuttingDown=true;
  logEvent('shutdown_start',{signal});

  const hardTimer=setTimeout(()=>{
   logEvent('shutdown_timeout');
   if(typeof server.closeAllConnections==='function'){
    server.closeAllConnections();
   }
   process.exit(1);
  },8000);
  hardTimer.unref();

  server.close(async()=>{
   try{
    await closeSqlPool();
    clearTimeout(hardTimer);
    logEvent('shutdown_complete');
    process.exit(0);
   }catch{
    clearTimeout(hardTimer);
    logEvent('shutdown_error');
    process.exit(1);
   }
  });
 };

 process.once('SIGTERM',()=>handleShutdown('SIGTERM'));
 process.once('SIGINT',()=>handleShutdown('SIGINT'));

 server.listen(port,'0.0.0.0',()=>{
  logEvent('startup',{port});
 });

 return server;
}
