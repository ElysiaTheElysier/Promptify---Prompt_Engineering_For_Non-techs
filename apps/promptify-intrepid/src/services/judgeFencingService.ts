import {getSqlPool} from './cloudPostgresService';

/** Short isolated SQL persistence operations; no transaction spans Gemini work. */
async function call(name:'product_lease_judge_dispatch'|'product_finish_judge_dispatch'|'product_settle_judge_dispatch',args:unknown[]):Promise<{data?:any;error?:Error}>{
 let client;
 try{
  client=await getSqlPool().connect();await client.query('BEGIN');await client.query('SET LOCAL ROLE service_role');
  await client.query("SET LOCAL statement_timeout='5000'");
  const {rows}=await client.query(`SELECT public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args);
  await client.query('COMMIT');return {data:rows[0]?.value};
 }catch(error){await client?.query('ROLLBACK').catch(()=>{});return {error:error as Error};}
 finally{client?.release?.();}
}
export function leaseJudgeDispatch(attempt:string,tokenSha:string,seconds:number){
 return call('product_lease_judge_dispatch',[attempt,tokenSha,seconds]);
}
export function finishJudgeDispatch(attempt:string,generation:number,dispatch:number,evaluation:unknown){
 return call('product_finish_judge_dispatch',[attempt,generation,dispatch,evaluation]);
}
export function settleJudgeDispatch(attempt:string,generation:number,dispatch:number,outcome:string,error:string|null,upstream:number|null){
 return call('product_settle_judge_dispatch',[attempt,generation,dispatch,outcome,error,upstream]);
}

/** Check expiry and release the claim under the same row lock as dispatch acquisition.
 * A read followed by the legacy generation-only settle could kill a newly reclaimed dispatch. */
export async function recoverLostJudgeDispatch(attempt:string,subject:string,at:number,graceMs:number):Promise<{data?:any;error?:Error}>{
 let client;
 try{
  client=await getSqlPool().connect();await client.query('BEGIN');await client.query('SET LOCAL ROLE service_role');
  await client.query("SET LOCAL statement_timeout='5000'");
  const {rows}=await client.query(`SELECT generation FROM public.product_judge_jobs
   WHERE attempt_id=$1 AND subject=$2 AND status='running'
    AND lease_until<=to_timestamp(($3::double precision-$4::double precision)/1000) FOR UPDATE`,[attempt,subject,at,graceMs]);
  let data={status:'stale'};
  if(rows.length){
   const result=await client.query("SELECT public.product_settle_judge($1,$2,'failed','worker_lost',NULL) value",[attempt,rows[0].generation]);
   data=result.rows[0]?.value;
  }
  await client.query('COMMIT');return {data};
 }catch(error){await client?.query('ROLLBACK').catch(()=>{});return {error:error as Error};}
 finally{client?.release?.();}
}
