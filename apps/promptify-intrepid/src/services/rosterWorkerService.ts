import {requireWorkspaceSheet} from './workspaceSourcePolicyService';
import {listFolderSheets} from './driveFolderService';
import {readRosterSource,finishWorkbookSync} from './rosterWorkbookService';
import {createDatabaseClient,requireCloudDatabase} from './cloudDatabaseService';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {readRoster} from './googleRosterService.js';

export function validWorkerSignature(headers:Record<string,unknown>,secret=process.env.ROSTER_WORKER_SECRET,now=Date.now()):boolean {
  const value=headers['x-promptify-signature'],timestamp=headers['x-promptify-timestamp'],nonce=headers['x-promptify-nonce'];
  if(!secret||secret.length<32||typeof value!=='string'||typeof timestamp!=='string'||typeof nonce!=='string')return false;
  if(!/^\d{10}$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>120||!/^[0-9a-f-]{36}$/i.test(nonce)||!/^[0-9a-f]{64}$/.test(value))return false;
  const incoming=Buffer.from(value,'hex'),expected=createHmac('sha256',secret).update(timestamp+'.'+nonce).digest();
  return incoming.length === expected.length && timingSafeEqual(incoming, expected);
}
type ClaimedSync={logId:string;sheetId:string;mapping:any;department:string};
type Db=ReturnType<typeof createDatabaseClient>;
/** Reads one claimed source and records the outcome. The class's approved Workspace sources (025) gate every read. */
async function syncClaimed(db:Db,task:ClaimedSync):Promise<'successful'|'failed'>{
  try {
    const scope=await db.from('product_sync_logs').select('class_id').eq('id',task.logId).single();
    if(scope.error||!scope.data?.class_id)throw new Error('Roster task scope unavailable.');
    await requireWorkspaceSheet(scope.data.class_id,task.sheetId,listFolderSheets);
    const bundle=await readRosterSource(task.sheetId,task.mapping,task.department);
    const rows=bundle?.rows||await readRoster(task.sheetId,task.mapping,task.department);
    if(bundle)await finishWorkbookSync(task.logId,rows,bundle);
    else {
      const done=await db.rpc('product_finish_roster_sync',{p_log:task.logId,p_rows:rows,p_error:null});
      if(done.error)throw new Error('Roster import rejected.');
    }
    return 'successful';
  } catch {
    const logged=await db.rpc('product_finish_roster_sync',{p_log:task.logId,p_rows:null,p_error:'roster_read_or_import_failed'});
    if(logged.error)throw new Error('Worker error recording failed.');
    return 'failed';
  }
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
    if(await syncClaimed(db,claim.data)==='successful')successful++;else failed++;
  }
  return {successful,failed};
}

/**
 * Staging worker on the API service (the Cloud Run route enforces its OIDC gate): the production due rules
 * (workbook schedule, 15-minute floor, auto sync on) for every class, two parallel claims at most.
 */
export async function runStagingRosterWorker() {
  requireCloudDatabase();
  const db=createDatabaseClient();
  const claims=await Promise.all([db.rpc('product_claim_roster_sync'),db.rpc('product_claim_roster_sync')]);
  const tasks=claims.flatMap(claim=>!claim.error&&claim.data?[claim.data as ClaimedSync]:[]);
  const processed=await Promise.all(tasks.map(task=>syncClaimed(db,task)));
  if(claims.some(claim=>claim.error))throw new Error('Staging roster claim failed.');
  return {
    claimed:tasks.length,
    successful:processed.filter(result=>result==='successful').length,
    failed:processed.filter(result=>result==='failed').length
  };
}
