import {getSqlPool} from './cloudPostgresService';

/** Operator-only aggregation, deliberately no public API route or learner data. */
export async function readProviderOperations(){
 const client=await getSqlPool().connect();
 try{
  await client.query('BEGIN');await client.query('SET LOCAL ROLE service_role');
  await client.query("SET LOCAL statement_timeout='2000'");
  const {rows}=await client.query(`SELECT
   count(*) FILTER(WHERE status='queued' AND expires_at>clock_timestamp())::int AS queued,
   count(*) FILTER(WHERE status='running' AND lease_until>clock_timestamp())::int AS running,
   count(*) FILTER(WHERE status='succeeded')::int AS succeeded,
   count(*) FILTER(WHERE status='failed')::int AS failed,
   count(*) FILTER(WHERE status='expired')::int AS expired,
   count(*) FILTER(WHERE upstream_status=429)::int AS provider_429,
   count(*) FILTER(WHERE status='running' AND lease_until<=clock_timestamp())::int AS stale_leases,
   max(extract(epoch FROM(clock_timestamp()-queued_at))) FILTER(WHERE status='queued' AND expires_at>clock_timestamp()) AS oldest_queue_seconds,
   count(*) FILTER(WHERE admitted_at IS NOT NULL AND actual_tokens IS NULL)::int AS unknown_usage,
   coalesce(sum(actual_tokens),0) AS known_tokens,
   percentile_cont(0.95) WITHIN GROUP(ORDER BY extract(epoch FROM(admitted_at-queued_at))*1000) AS queue_p95_ms,
   percentile_cont(0.95) WITHIN GROUP(ORDER BY extract(epoch FROM(settled_at-admitted_at))*1000)
    FILTER(WHERE upstream_status IS NOT NULL) AS provider_and_settlement_p95_ms
   FROM public.product_provider_calls WHERE queued_at>clock_timestamp()-interval '1 hour'`);
  const budget=await client.query('SELECT concurrency,tokens_per_minute,max_backlog,tenant_backlog,breaker_until FROM public.product_provider_budget WHERE id=1');
  await client.query('COMMIT');
  const stats=rows[0],terminal=Number(stats.succeeded)+Number(stats.failed)+Number(stats.expired);
  return {windowSeconds:3600,...stats,providerCompletionRate:terminal?Number(stats.succeeded)/terminal:null,budget:budget.rows[0],costPerGrade:null,costStatus:'requires verified pricing and complete per-grade token usage'};
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release?.();}
}

/** Run/grade completion is different from one successful provider call. Requires 012 + 014. */
export async function readPipelineOperations(){
 const client=await getSqlPool().connect();
 try{
  await client.query('BEGIN');await client.query('SET LOCAL ROLE service_role');
  await client.query("SET LOCAL statement_timeout='2000'");
  const {rows}=await client.query(`SELECT count(*)::int AS accepted_runs,
   count(*) FILTER(WHERE g.status='queued')::int AS queued,
   count(*) FILTER(WHERE g.status='generating')::int AS generating,
   count(*) FILTER(WHERE r.result IS NOT NULL)::int AS generated,
   count(*) FILTER(WHERE j.status IN('queued','running','retry_wait') AND a.evaluation_json IS NULL)::int AS judging,
   count(*) FILTER(WHERE a.evaluation_json IS NOT NULL)::int AS completed,
   count(*) FILTER(WHERE a.evaluation_json IS NULL AND (g.status IN('failed','expired') OR j.status IN('failed','expired')))::int AS failed,
   count(*) FILTER(WHERE g.status='generating' AND g.lease_until<=clock_timestamp())::int AS stale_generation_leases,
   max(extract(epoch FROM(clock_timestamp()-g.created_at))) FILTER(WHERE g.status='queued') AS oldest_generation_queue_seconds,
   percentile_cont(0.95) WITHIN GROUP(ORDER BY extract(epoch FROM(g.updated_at-g.created_at))*1000)
    FILTER(WHERE g.status='generated') AS generation_p95_ms,
   percentile_cont(0.95) WITHIN GROUP(ORDER BY extract(epoch FROM(j.updated_at-g.created_at))*1000)
    FILTER(WHERE j.status='succeeded') AS async_grade_p95_ms
   FROM public.product_generation_jobs g
   JOIN public.rebuild_runs r ON r.subject=g.subject AND r.request_id=g.request_id
   LEFT JOIN public.prompt_attempts a ON a.id=r.attempt_id
   LEFT JOIN public.product_judge_jobs j ON j.attempt_id=r.attempt_id
   WHERE g.created_at>clock_timestamp()-interval '1 hour'`);
  await client.query('COMMIT');const row=rows[0],terminal=Number(row.completed)+Number(row.failed);
  return {windowSeconds:3600,...row,terminalCompletionRate:terminal?Number(row.completed)/terminal:null,
   completedFractionOfAccepted:Number(row.accepted_runs)?Number(row.completed)/Number(row.accepted_runs):null,
   costPerGrade:null,costStatus:'requires verified pricing and complete per-grade token usage'};
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release?.();}
}
