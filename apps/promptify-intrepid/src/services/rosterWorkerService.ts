import {requireWorkspaceSource} from './workspaceSourcePolicyService';
import {readRosterSource,finishWorkbookSync} from './rosterWorkbookService';
import {createDatabaseClient,requireCloudDatabase} from './cloudDatabaseService';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {readRoster} from './googleRosterService.js';
import {claimStagingRosterSync,STAGING_ROSTER_FIXTURES} from './stagingRosterClaimService';

export function validWorkerSignature(headers:Record<string,unknown>,secret=process.env.ROSTER_WORKER_SECRET,now=Date.now()):boolean {
  const value=headers['x-promptify-signature'],timestamp=headers['x-promptify-timestamp'],nonce=headers['x-promptify-nonce'];
  if(!secret||secret.length<32||typeof value!=='string'||typeof timestamp!=='string'||typeof nonce!=='string')return false;
  if(!/^\d{10}$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>120||!/^[0-9a-f-]{36}$/i.test(nonce)||!/^[0-9a-f]{64}$/.test(value))return false;
  const incoming=Buffer.from(value,'hex'),expected=createHmac('sha256',secret).update(timestamp+'.'+nonce).digest();
  return incoming.length === expected.length && timingSafeEqual(incoming, expected);
}
export async function runRosterWorker(nonce:string) {
  requireCloudDatabase();
  const db=createDatabaseClient();
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
      const scope=await db.from('product_sync_logs').select('class_id').eq('id',task.logId).single();
      if(scope.error||!scope.data?.class_id)throw new Error('Roster task scope unavailable.');
      requireWorkspaceSource(scope.data.class_id,'sheets',task.sheetId);
      const bundle=await readRosterSource(task.sheetId,task.mapping,task.department);
      const rows=bundle?.rows||await readRoster(task.sheetId,task.mapping,task.department);
      if(bundle){await finishWorkbookSync(task.logId,rows,bundle);successful++;continue;}
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

/**
 * Staging-only worker path: two fixed synthetic sources, two parallel claims at most,
 * and a five-minute source due interval. The Cloud Run route enforces its OIDC gate.
 */
export async function runStagingRosterWorker() {
  requireCloudDatabase();
  const claims=await Promise.allSettled([claimStagingRosterSync(),claimStagingRosterSync()]);
  const tasks=claims.flatMap(result=>result.status==='fulfilled'&&result.value?[result.value]:[]);
  const db=createDatabaseClient();
  const processed=await Promise.all(tasks.map(async task=>{
    try {
      const expected=STAGING_ROSTER_FIXTURES.find(fixture=>fixture.classId===task.classId&&fixture.sheetId===task.sheetId);
      if(!expected)throw new Error('Staging roster scope rejected.');
      const scope=await db.from('product_sync_logs').select('class_id').eq('id',task.logId).single();
      if(scope.error||scope.data?.class_id!==expected.classId)throw new Error('Staging roster task scope unavailable.');
      requireWorkspaceSource(expected.classId,'sheets',expected.sheetId);
      const bundle=await readRosterSource(expected.sheetId,task.mapping as any,task.department);
      const rows=bundle?.rows||await readRoster(expected.sheetId,task.mapping as any,task.department);
      if(bundle)await finishWorkbookSync(task.logId,rows,bundle);
      else {
        const done=await db.rpc('product_finish_roster_sync',{p_log:task.logId,p_rows:rows,p_error:null});
        if(done.error)throw new Error('Staging roster import rejected.');
      }
      return 'successful' as const;
    } catch {
      const logged=await db.rpc('product_finish_roster_sync',{p_log:task.logId,p_rows:[],p_error:'roster_read_or_import_failed'});
      if(logged.error)throw new Error('Staging worker error recording failed.');
      return 'failed' as const;
    }
  }));
  if(claims.some(result=>result.status==='rejected'))throw new Error('Staging roster claim failed.');
  return {
    claimed:tasks.length,
    successful:processed.filter(result=>result==='successful').length,
    failed:processed.filter(result=>result==='failed').length
  };
}
