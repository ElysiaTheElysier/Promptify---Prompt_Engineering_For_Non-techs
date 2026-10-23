BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE TABLE public.product_worker_invocations(nonce uuid PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.product_worker_invocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_worker_invocations FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.product_worker_invocations TO service_role;
CREATE FUNCTION public.product_accept_worker_invocation(p_nonce uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE affected integer;
BEGIN
 DELETE FROM public.product_worker_invocations WHERE created_at<now()-interval '7 days';
 INSERT INTO public.product_worker_invocations(nonce) VALUES(p_nonce) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS affected=ROW_COUNT;
 RETURN affected=1;
END $$;
REVOKE ALL ON FUNCTION public.product_accept_worker_invocation(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.product_accept_worker_invocation(uuid) TO service_role;

CREATE FUNCTION public.product_dispatch_roster_worker() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE worker_secret text; tick text:=floor(extract(epoch FROM now()))::bigint::text;
 nonce text:=gen_random_uuid()::text; signature text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.product_sheet_connections s JOIN public.classes c ON c.id=s.class_id
 WHERE s.auto_sync AND c.status IN ('active','upcoming')
 AND coalesce(s.last_attempt_at,s.last_synced_at,'epoch'::timestamptz)<now()-interval '15 minutes') THEN RETURN NULL; END IF;
 SELECT decrypted_secret INTO STRICT worker_secret FROM vault.decrypted_secrets WHERE name='promptify_roster_worker_secret';
 signature:=encode(extensions.hmac(convert_to(tick||'.'||nonce,'UTF8'),convert_to(worker_secret,'UTF8'),'sha256'),'hex');
 -- Only a short-lived signature enters pg_net; the permanent secret stays in Vault.
 RETURN net.http_post(url:='https://promptify-rebuild.vercel.app/api/roster-worker',
 headers:=jsonb_build_object('Content-Type','application/json','x-promptify-timestamp',tick,
 'x-promptify-nonce',nonce,'x-promptify-signature',signature),body:='{}'::jsonb,timeout_milliseconds:=55000);
END $$;
REVOKE ALL ON FUNCTION public.product_dispatch_roster_worker() FROM PUBLIC,anon,authenticated,service_role;
-- The deployment script enables the job only after the signed endpoint is verified.
COMMIT;
NOTIFY pgrst,'reload schema';
