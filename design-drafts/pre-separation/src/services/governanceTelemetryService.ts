import type {SupabaseClient} from '@supabase/supabase-js';

type Row={attempt_id:string|null;tokens:unknown;latency_ms:unknown};
export function vietnamDayStart(now=new Date()) {
 const local=new Date(now.getTime()+7*3600000);
 return new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-7*3600000).toISOString();
}
export function summarizeGenerationTelemetry(rows:Row[],truncated=false) {
 const completed=rows.filter(row=>row.attempt_id);
 const numbers=(key:'tokens'|'latency_ms')=>completed.map(row=>row[key]).filter((value):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0);
 const tokens=numbers('tokens'),latencies=numbers('latency_ms');
 return {completed:completed.length,token_samples:tokens.length,tokens:tokens.length?tokens.reduce((sum,n)=>sum+n,0):null,latency_samples:latencies.length,average_latency_ms:latencies.length?latencies.reduce((sum,n)=>sum+n,0)/latencies.length:null,truncated};
}
// Called only after the governance action verifies administrator/class access.
// Fetch numeric metadata only: never return prompts, outputs or learner identities.
export async function readGenerationTelemetry(server:SupabaseClient,classId:string,now=new Date()) {
 const rows:Row[]=[];
 const start=vietnamDayStart(now),end=now.toISOString();
 for(let offset=0;offset<=10000;offset+=1000){
  const {data,error}=await server.from('rebuild_runs').select('attempt_id,tokens:result->tokens,latency_ms:result->latencyMs').eq('class_id',classId).gte('created_at',start).lte('created_at',end).not('result','is',null).order('created_at').order('request_id').range(offset,offset+999);
  if(error)throw new Error('Generation telemetry is unavailable.');
  if(offset===10000)return {...summarizeGenerationTelemetry(rows,Boolean(data?.length)),day_start:start,observed_at:end};
  rows.push(...(data||[]) as unknown as Row[]);
  if(!data||data.length<1000)break;
 }
 return {...summarizeGenerationTelemetry(rows),day_start:start,observed_at:end};
}
