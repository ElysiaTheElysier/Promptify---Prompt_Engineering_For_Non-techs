import {AsyncLocalStorage} from 'node:async_hooks';
import {recordRequestTime} from './requestTimingService';
import {Pool,types} from 'pg';
types.setTypeParser(1700,Number);
types.setTypeParser(1184,value=>new Date(value).toISOString());
types.setTypeParser(20,value=>{const number=Number(value);return Number.isSafeInteger(number)?number:value;});
export interface SqlConnection {query(text:string,values?:any[]):Promise<{rows:any[]}>;release?:()=>void}
export interface SqlPool {supportsServiceScope?:boolean;connect():Promise<SqlConnection>;end?:()=>Promise<void>}
let pool:SqlPool|undefined;
const serviceScope=new AsyncLocalStorage<SqlConnection>();
/** One service-role transaction for a bounded read pipeline; actor/RLS transactions never reuse it. */
export async function withServiceScope<T>(work:()=>Promise<T>):Promise<T>{
 if(serviceScope.getStore()||!getSqlPool().supportsServiceScope)return work();
 return sqlTransaction(undefined,client=>{
  let tail=Promise.resolve();
  const queued:SqlConnection={query(text,values){const pending=tail.then(()=>client.query(text,values));tail=pending.then(()=>undefined,()=>undefined);return pending;}};
  return serviceScope.run(queued,work);
 });
}
export function configureSqlPoolForTests(value:SqlPool){if(process.env.NODE_ENV!=='test')throw Error('SQL test injection requires NODE_ENV=test');pool=value;}
export function getSqlPool():SqlPool {
 if(!pool){if(!process.env.DATABASE_URL&&!process.env.PGHOST)throw Error('Cloud SQL is not configured');
 pool=Object.assign(new Pool({connectionString:process.env.DATABASE_URL,host:process.env.PGHOST,database:process.env.PGDATABASE,user:process.env.PGUSER,password:process.env.PGPASSWORD,max:Number(process.env.PGPOOL_MAX||5),connectionTimeoutMillis:10000,idleTimeoutMillis:30000,statement_timeout:55000}),{supportsServiceScope:true});}
 return pool;
}
export async function closeSqlPool():Promise<void>{
 const currentPool=pool;
 pool=undefined;
 if(currentPool?.end){
  await currentPool.end();
 }
}
export type VerifiedActor={subject:string;email:string;firebaseUid:string;userId?:string};
export async function sqlTransaction<T>(actor:VerifiedActor|undefined,work:(client:SqlConnection)=>Promise<T>):Promise<T>{
 const scoped=serviceScope.getStore();if(!actor&&scoped)return work(scoped);
 const started=performance.now();const client=await getSqlPool().connect();try{
  await client.query('BEGIN');await client.query(actor?'SET LOCAL ROLE authenticated':'SET LOCAL ROLE service_role');
  if(actor)await client.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[actor.subject,JSON.stringify({sub:actor.subject,email:actor.email,role:'authenticated'})]);
  const result=await work(client);await client.query('COMMIT');return result;
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release?.();recordRequestTime('sql',performance.now()-started);}
}
