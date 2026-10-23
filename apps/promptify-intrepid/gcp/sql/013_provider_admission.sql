-- Global across ALL instances and queues; no provider payload or credentials stored here.
BEGIN;
CREATE TABLE public.product_provider_budget (
 id integer PRIMARY KEY CHECK(id=1), concurrency integer NOT NULL DEFAULT 4 CHECK(concurrency BETWEEN 1 AND 100),
 tokens_per_minute integer NOT NULL DEFAULT 120000 CHECK(tokens_per_minute>0),
 max_backlog integer NOT NULL DEFAULT 200 CHECK(max_backlog BETWEEN 1 AND 10000),
 tenant_backlog integer NOT NULL DEFAULT 20 CHECK(tenant_backlog BETWEEN 1 AND 1000),
 breaker_until timestamptz, consecutive_failures integer NOT NULL DEFAULT 0
);
INSERT INTO public.product_provider_budget(id) VALUES(1);
CREATE TABLE public.product_provider_calls (
 id uuid PRIMARY KEY, queue_sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 tenant text NOT NULL CHECK(length(tenant) BETWEEN 1 AND 128),
 correlation_id uuid NOT NULL, estimated_tokens integer NOT NULL CHECK(estimated_tokens>0),
 status text NOT NULL CHECK(status IN('queued','running','succeeded','failed','expired')),
 fence integer NOT NULL DEFAULT 0, queued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL, admitted_at timestamptz, lease_until timestamptz, settled_at timestamptz,
 upstream_status integer, actual_tokens integer CHECK(actual_tokens>=0)
);
CREATE INDEX product_provider_queue ON public.product_provider_calls(status,queue_sequence);
CREATE INDEX product_provider_window ON public.product_provider_calls(admitted_at);
CREATE INDEX product_provider_tenant ON public.product_provider_calls(tenant,admitted_at DESC);
CREATE INDEX product_provider_retention ON public.product_provider_calls(settled_at);
ALTER TABLE public.product_provider_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_provider_calls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_provider_budget,public.product_provider_calls FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.product_provider_budget,public.product_provider_calls TO service_role;
REVOKE ALL ON SEQUENCE public.product_provider_calls_queue_sequence_seq FROM PUBLIC,anon,authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.product_provider_calls_queue_sequence_seq TO service_role;
CREATE POLICY service_only ON public.product_provider_budget TO service_role USING(true) WITH CHECK(true);
CREATE POLICY service_only ON public.product_provider_calls TO service_role USING(true) WITH CHECK(true);

CREATE FUNCTION public.product_provider_enqueue(p_id uuid,p_tenant text,p_correlation uuid,p_tokens integer,p_ttl integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE b public.product_provider_budget; old public.product_provider_calls;
BEGIN
 SELECT * INTO STRICT b FROM public.product_provider_budget WHERE id=1 FOR UPDATE;
 IF p_ttl NOT BETWEEN 1 AND 900 OR p_tokens<1 OR p_tokens>b.tokens_per_minute OR length(p_tenant) NOT BETWEEN 1 AND 128 THEN RETURN 'oversize'; END IF;
 SELECT * INTO old FROM public.product_provider_calls WHERE id=p_id;
 IF FOUND THEN
  IF old.tenant<>p_tenant OR old.estimated_tokens<>p_tokens OR old.correlation_id<>p_correlation THEN RETURN 'conflict'; END IF;
  RETURN old.status;
 END IF;
 UPDATE public.product_provider_calls SET status='expired',settled_at=clock_timestamp()
 WHERE (status='queued' AND expires_at<=clock_timestamp()) OR (status='running' AND lease_until<=clock_timestamp());
 -- Bounded maintenance on admission; no recurring service/resource required. Keep tombstones 24h.
 DELETE FROM public.product_provider_calls WHERE id IN (
  SELECT id FROM public.product_provider_calls WHERE status IN('succeeded','failed','expired')
  AND settled_at<clock_timestamp()-interval '24 hours' ORDER BY settled_at LIMIT 100);
 IF (SELECT count(*) FROM public.product_provider_calls WHERE status IN('queued','running'))>=b.max_backlog
 OR (SELECT count(*) FROM public.product_provider_calls WHERE status IN('queued','running') AND tenant=p_tenant)>=b.tenant_backlog THEN RETURN 'backpressure'; END IF;
 INSERT INTO public.product_provider_calls(id,tenant,correlation_id,estimated_tokens,status,expires_at)
 VALUES(p_id,p_tenant,p_correlation,p_tokens,'queued',clock_timestamp()+make_interval(secs=>p_ttl));
 RETURN 'queued';
END $$;

CREATE FUNCTION public.product_provider_acquire(p_id uuid,p_lease integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE b public.product_provider_budget; j public.product_provider_calls; head_tokens integer; eligible uuid[]; used bigint; active integer;
BEGIN
 IF p_lease NOT BETWEEN 1 AND 360 THEN RAISE EXCEPTION 'Invalid provider lease'; END IF;
 -- One lock serializes admission across every Cloud Run instance, queue and tenant.
 SELECT * INTO STRICT b FROM public.product_provider_budget WHERE id=1 FOR UPDATE;
 UPDATE public.product_provider_calls SET status='expired',settled_at=clock_timestamp()
 WHERE (status='queued' AND expires_at<=clock_timestamp()) OR (status='running' AND lease_until<=clock_timestamp());
 SELECT * INTO j FROM public.product_provider_calls WHERE id=p_id;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
 IF j.status<>'queued' THEN RETURN jsonb_build_object('status',j.status); END IF;
 IF b.breaker_until>clock_timestamp() THEN RETURN jsonb_build_object('status','circuit_open'); END IF;
 SELECT count(*) INTO active FROM public.product_provider_calls WHERE status='running';
 IF active>=b.concurrency THEN RETURN jsonb_build_object('status','wait'); END IF;
 -- Keep full reservation for a running call, even beyond a minute; completed calls retain
 -- max(estimate, actual) for 60s. No optimistic token refund on timeout/unknown usage.
 SELECT coalesce(sum(greatest(estimated_tokens,coalesce(actual_tokens,0))),0) INTO used
 FROM public.product_provider_calls WHERE admitted_at IS NOT NULL AND
 (status='running' OR coalesce(settled_at,admitted_at)>clock_timestamp()-interval '60 seconds');
 -- Protect an old large head from an endless stream of small calls.
 SELECT q.estimated_tokens INTO head_tokens FROM public.product_provider_calls q
 LEFT JOIN LATERAL (SELECT max(admitted_at) last_at FROM public.product_provider_calls h WHERE h.tenant=q.tenant) served ON true
 WHERE q.status='queued' ORDER BY served.last_at NULLS FIRST,q.queue_sequence LIMIT 1;
 IF used+head_tokens>b.tokens_per_minute THEN RETURN jsonb_build_object('status','wait'); END IF;
 -- Permit a bounded batch of the oldest last-served tenant heads, FIFO within each tenant.
 -- One sleeping caller must not idle every free slot across all instances.
 SELECT array_agg(candidate.id) INTO eligible FROM (
  SELECT heads.id FROM (
   SELECT DISTINCT ON(tenant) id,tenant,queue_sequence FROM public.product_provider_calls
   WHERE status='queued' ORDER BY tenant,queue_sequence
  ) heads
  LEFT JOIN LATERAL (SELECT max(admitted_at) last_at FROM public.product_provider_calls h WHERE h.tenant=heads.tenant) served ON true
  ORDER BY served.last_at NULLS FIRST,heads.queue_sequence LIMIT b.concurrency-active
 ) candidate;
 IF NOT(p_id=ANY(eligible)) OR used+j.estimated_tokens>b.tokens_per_minute THEN RETURN jsonb_build_object('status','wait'); END IF;
 UPDATE public.product_provider_calls SET status='running',fence=fence+1,admitted_at=clock_timestamp(),
 lease_until=clock_timestamp()+make_interval(secs=>p_lease) WHERE id=p_id RETURNING * INTO j;
 RETURN jsonb_build_object('status','admitted','fence',j.fence,'queue_ms',extract(epoch FROM (j.admitted_at-j.queued_at))*1000);
END $$;

CREATE FUNCTION public.product_provider_settle(p_id uuid,p_fence integer,p_status integer,p_tokens integer DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE j public.product_provider_calls;
BEGIN
 PERFORM 1 FROM public.product_provider_budget WHERE id=1 FOR UPDATE;
 SELECT * INTO j FROM public.product_provider_calls WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR j.status<>'running' OR j.fence<>p_fence OR j.lease_until<=clock_timestamp() THEN RETURN false; END IF;
 UPDATE public.product_provider_calls SET status=CASE WHEN p_status BETWEEN 200 AND 299 THEN 'succeeded' ELSE 'failed' END,
 settled_at=clock_timestamp(),upstream_status=p_status,actual_tokens=p_tokens WHERE id=p_id;
 IF p_status IN(429,503) THEN
  UPDATE public.product_provider_budget SET consecutive_failures=consecutive_failures+1,
  breaker_until=CASE WHEN consecutive_failures+1>=3 THEN clock_timestamp()+interval '15 seconds' ELSE breaker_until END WHERE id=1;
 ELSIF p_status BETWEEN 200 AND 299 THEN
  UPDATE public.product_provider_budget SET consecutive_failures=0,breaker_until=NULL WHERE id=1;
 END IF;
 RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.product_provider_enqueue(uuid,text,uuid,integer,integer),public.product_provider_acquire(uuid,integer),public.product_provider_settle(uuid,integer,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.product_provider_enqueue(uuid,text,uuid,integer,integer),public.product_provider_acquire(uuid,integer),public.product_provider_settle(uuid,integer,integer,integer) TO service_role;
COMMIT;
