BEGIN;
CREATE FUNCTION public.product_save_class(p_class uuid,p_status text,p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('active','upcoming','completed','archived') OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Valid lifecycle and audit reason required'; END IF;
 UPDATE public.classes SET status=p_status WHERE id=p_class;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'cohort.lifecycle',btrim(p_reason));
END $$;
CREATE FUNCTION public.product_save_domain(p_class uuid,p_domain text,p_active boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE client uuid; normalized text:=lower(btrim(p_domain));
BEGIN
 IF NOT public.product_can_manage(p_class) OR NOT EXISTS(SELECT 1 FROM public.users WHERE id=public.current_user_id() AND role='admin') THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF normalized IS NULL OR length(normalized)>253 OR normalized !~ '^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$' OR p_active IS NULL THEN RAISE EXCEPTION 'Valid domain policy required'; END IF;
 SELECT client_id INTO STRICT client FROM public.classes WHERE id=p_class;
 INSERT INTO public.product_domains(client_id,domain,active,updated_by,updated_at) VALUES(client,normalized,p_active,public.current_user_id(),now()) ON CONFLICT(client_id,domain) DO UPDATE SET active=excluded.active,updated_by=excluded.updated_by,updated_at=now();
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'domain.policy',normalized||' / '||CASE WHEN p_active THEN 'active' ELSE 'disabled' END);
END $$;
CREATE FUNCTION public.product_validate_studio_nested() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE field text; expected text; row jsonb; entry record;
BEGIN
 FOREACH field IN ARRAY ARRAY['variables','scaffold','materials'] LOOP
  FOR row IN SELECT value FROM jsonb_array_elements(NEW.config->field) LOOP
   FOREACH expected IN ARRAY CASE field WHEN 'variables' THEN ARRAY['name','type','sample','mappedTo'] WHEN 'scaffold' THEN ARRAY['id','name','tag','rubricKey'] ELSE ARRAY['id','type','name','url','version','updated','log'] END LOOP
    IF jsonb_typeof(row->expected) IS DISTINCT FROM 'string' OR length(row->>expected)>20000 THEN RAISE EXCEPTION 'Invalid Studio nested field'; END IF;
   END LOOP;
   IF field='materials' AND coalesce(row->>'url','')<>'' AND row->>'url' !~ '^https?://[^[:space:]]+$' THEN RAISE EXCEPTION 'Invalid material URL'; END IF;
  END LOOP;
 END LOOP;
 IF NEW.config#>'{awards,gamificationLinks}' IS NOT NULL THEN
  FOR row IN SELECT value FROM jsonb_array_elements(NEW.config#>'{awards,gamificationLinks}') LOOP
   IF coalesce(row->>'url','')<>'' AND row->>'url' !~ '^https?://[^[:space:]]+$' THEN RAISE EXCEPTION 'Invalid game URL'; END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER product_validate_studio_nested BEFORE INSERT OR UPDATE ON public.product_studio FOR EACH ROW EXECUTE FUNCTION public.product_validate_studio_nested();
REVOKE ALL ON FUNCTION public.product_save_class(uuid,text,text),public.product_save_domain(uuid,text,boolean),public.product_validate_studio_nested() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.product_save_class(uuid,text,text),public.product_save_domain(uuid,text,boolean) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
