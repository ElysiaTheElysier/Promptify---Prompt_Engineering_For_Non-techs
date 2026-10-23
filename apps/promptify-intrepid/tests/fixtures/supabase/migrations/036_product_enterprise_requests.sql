-- Public onboarding captures requests only. Access/grants remain administrator controlled.
BEGIN;
CREATE TABLE public.product_enterprise_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL UNIQUE,
 company text NOT NULL CHECK(length(company) BETWEEN 2 AND 200),
 tax_id text NOT NULL DEFAULT '' CHECK(length(tax_id)<=80),
 employees text NOT NULL CHECK(employees IN ('50 - 200 staff','200 - 1,000 staff','1,000+ staff')),
 email text NOT NULL CHECK(length(email)<=254),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','contacted','closed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_enterprise_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_enterprise_requests FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.product_enterprise_requests TO service_role;
CREATE INDEX product_enterprise_email_time ON public.product_enterprise_requests(email,created_at);
CREATE FUNCTION public.product_submit_enterprise_request(p_request uuid,p_company text,p_tax text,p_employees text,p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE saved uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(lower(p_email)));
 SELECT id INTO saved FROM product_enterprise_requests WHERE request_id=p_request AND email=lower(p_email);
 IF saved IS NOT NULL THEN RETURN jsonb_build_object('saved',true); END IF;
 IF EXISTS(SELECT 1 FROM product_enterprise_requests WHERE email=lower(p_email) AND created_at>now()-interval '24 hours') THEN
  RETURN jsonb_build_object('saved',true);
 END IF;
 INSERT INTO product_enterprise_requests(request_id,company,tax_id,employees,email)
 VALUES(p_request,btrim(p_company),btrim(p_tax),p_employees,lower(p_email));
 RETURN jsonb_build_object('saved',true);
END $$;
REVOKE ALL ON FUNCTION public.product_submit_enterprise_request(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.product_submit_enterprise_request(uuid,text,text,text,text) TO service_role;
COMMIT;
NOTIFY pgrst,'reload schema';
