import {createClient} from '@supabase/supabase-js';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {readRoster} from './googleRosterService.js';

export function validWorkerSignature(headers:Record<string,unknown>,secret=process.env.ROSTER_WORKER_SECRET,now=Date.now()):boolean {
  const value=headers['x-promptify-signature'],timestamp=headers['x-promptify-timestamp'],nonce=headers['x-promptify-nonce'];
  if(!secret||secret.length<32||typeof value!=='string'||typeof timestamp!=='string'||typeof nonce!=='string')return false;
  if(!/^\d{10}$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>120||!/^[0-9a-f-]{36}$/i.test(nonce)||!/^[0-9a-f]{64}$/.test(value))return false;
  const incoming=Buffer.from(value,'hex'),expected=createHmac('sha256',secret).update(timestamp+'.'+nonce).digest();
  return incoming.length === expected.length && timingSafeEqual(incoming, expected);
}
export async function runRosterWorker(nonce:string) {
  const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('Worker configuration unavailable.');
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const accepted=await db.rpc('product_accept_worker_invocation',{p_nonce:nonce});
  if(accepted.error)throw new Error('Worker invocation unavailable.');
  if(!accepted.data)return {successful:0,failed:0,replayed:true};
  let successful=0,failed=0;
  // One token/read pair is bounded to 30 seconds; subsequent ticks claim remaining work.
  for(let index=0;index<1;index++) {
    const claim=await db.rpc('product_claim_roster_sync');
    if(claim.error)throw new Error('Worker claim failed.');
    if(!claim.data)break;
    const task=claim.data;
    try {
      const rows=await readRoster(task.sheetId,task.mapping,task.department);
      const done=await db.rpc('product_finish_roster_sync',{p_log:task.logId,p_rows:rows,p_error:null});
      if(done.error)throw new Error('Roster import rejected.');
      successful++;
    } catch {
      const logged=await db.rpc('product_finish_roster_sync',{p_log:task.logId,p_rows:null,p_error:'roster_read_or_import_failed'});
      if(logged.error)throw new Error('Worker error recording failed.');
      failed++;
    }
  }
  return {successful,failed};
}
