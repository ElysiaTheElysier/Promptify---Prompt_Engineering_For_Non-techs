import {randomUUID} from 'node:crypto';
import {ApiAccessError} from './apiAuthorizationService.js';
import type {CloudDatabaseClient} from './cloudDatabaseService';
import {embedSopChunks,type SopChunk} from './sopIngestionService.js';

/** A claim is not a timer: unknown external outcomes require reconciliation. */
export async function indexPendingContribution(server:CloudDatabaseClient,
 source:{id:string;class_id:string;chunks:SopChunk[];indexed_chunks?:SopChunk[]|null},
 embed=embedSopChunks){
 if(source.indexed_chunks)return source.indexed_chunks;
 const claim=randomUUID();
 const acquired=await server.from('product_sop_contributions')
  .update({indexing_claim:claim,indexing_claimed_at:new Date().toISOString()})
  .eq('id',source.id).eq('class_id',source.class_id).eq('status','pending')
  .is('indexing_claim',null).is('indexed_chunks',null).select('id').maybeSingle();
 if(acquired.error)throw new ApiAccessError('Source indexing claim could not be saved.',503);
 if(!acquired.data)throw new ApiAccessError('Source indexing is processing or uncertain.',409);
 try{
  const chunks=await embed(source.chunks);
  const saved=await server.from('product_sop_contributions').update({indexed_chunks:chunks})
   .eq('id',source.id).eq('class_id',source.class_id).eq('status','pending')
   .eq('indexing_claim',claim).select('id').maybeSingle();
  if(saved.error||!saved.data)throw new ApiAccessError('Indexed evidence could not be saved; reconcile before retrying.',503);
  return chunks;
 }catch(error){
  // Only explicit completed failure responses/config validation are safe to release.
  // A timeout, connection loss or persistence failure retains ownership and evidence.
  if((error as {indexingOutcome?:string})?.indexingOutcome==='known-failure'){
   const released=await server.from('product_sop_contributions')
    .update({indexing_claim:null,indexing_claimed_at:null})
    .eq('id',source.id).eq('class_id',source.class_id).eq('status','pending')
    .eq('indexing_claim',claim).is('indexed_chunks',null).select('id').maybeSingle();
   if(released.error||!released.data)throw new ApiAccessError('Indexing failed and claim recovery is uncertain; contact the trainer.',503);
  }
  throw error;
 }
}
