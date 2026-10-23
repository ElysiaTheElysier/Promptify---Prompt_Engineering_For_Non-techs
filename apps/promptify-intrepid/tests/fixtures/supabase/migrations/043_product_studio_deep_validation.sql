BEGIN;
CREATE FUNCTION public.product_validate_studio_config() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE cfg jsonb:=NEW.config; field text; row jsonb; rule jsonb;
BEGIN
 IF jsonb_typeof(cfg) IS DISTINCT FROM 'object' OR octet_length(cfg::text)>300000 THEN RAISE EXCEPTION 'Invalid Studio configuration size'; END IF;
 FOREACH field IN ARRAY ARRAY['pillar','branch','competencies','startTime','endTime'] LOOP
  IF jsonb_typeof(cfg->field) IS DISTINCT FROM 'string' OR length(cfg->>field)>20000 THEN RAISE EXCEPTION 'Invalid Studio text field'; END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['departments','objectives','variables','scaffold','materials'] LOOP
  IF jsonb_typeof(cfg->field) IS DISTINCT FROM 'array' OR jsonb_array_length(cfg->field)>100 THEN RAISE EXCEPTION 'Invalid Studio array'; END IF;
  FOR row IN SELECT value FROM jsonb_array_elements(cfg->field) LOOP
   IF field IN ('departments','objectives') THEN
    IF jsonb_typeof(row) IS DISTINCT FROM 'string' OR length(row#>>'{}')>2000 THEN RAISE EXCEPTION 'Invalid Studio list item'; END IF;
   ELSE
    IF jsonb_typeof(row) IS DISTINCT FROM 'object' OR octet_length(row::text)>100000 THEN RAISE EXCEPTION 'Invalid Studio object'; END IF;
    IF field='scaffold' AND jsonb_typeof(row->'active') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid scaffold state'; END IF;
   END IF;
  END LOOP;
 END LOOP;
 IF jsonb_typeof(cfg->'awards') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid award settings'; END IF;
 IF cfg#>'{awards,passThreshold}' IS NOT NULL AND (jsonb_typeof(cfg#>'{awards,passThreshold}')<>'number' OR (cfg#>>'{awards,passThreshold}')::numeric NOT BETWEEN 0 AND 10) THEN RAISE EXCEPTION 'Invalid passing threshold'; END IF;
 rule:=cfg#>'{awards,issuance}';
 IF rule IS NOT NULL THEN
  IF jsonb_typeof(rule)<>'object' OR jsonb_typeof(rule->'minimumAverageScore') IS DISTINCT FROM 'number' OR (rule->>'minimumAverageScore')::numeric NOT BETWEEN 0 AND 10 THEN RAISE EXCEPTION 'Invalid award score rule'; END IF;
  FOREACH field IN ARRAY ARRAY['badgeOnPass','certificateOnCompletion','requireAttendance'] LOOP
   IF jsonb_typeof(rule->field) IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid award rule'; END IF;
  END LOOP;
 END IF;
 FOREACH field IN ARRAY ARRAY['badges','gamificationLinks'] LOOP
  IF cfg#>ARRAY['awards',field] IS NOT NULL THEN
   IF jsonb_typeof(cfg#>ARRAY['awards',field])<>'array' OR jsonb_array_length(cfg#>ARRAY['awards',field])>100 THEN RAISE EXCEPTION 'Invalid award list'; END IF;
   FOR row IN SELECT value FROM jsonb_array_elements(cfg#>ARRAY['awards',field]) LOOP
    IF jsonb_typeof(row)<>'object' OR EXISTS(SELECT 1 FROM jsonb_each(row) entry WHERE jsonb_typeof(entry.value)<>'string' OR length(entry.value#>>'{}')>20000) THEN RAISE EXCEPTION 'Invalid award list item'; END IF;
   END LOOP;
  END IF;
 END LOOP;
 IF cfg#>'{awards,certificate}' IS NOT NULL AND (jsonb_typeof(cfg#>'{awards,certificate}')<>'object' OR EXISTS(SELECT 1 FROM jsonb_each(cfg#>'{awards,certificate}') entry WHERE jsonb_typeof(entry.value)<>'string' OR length(entry.value#>>'{}')>20000)) THEN RAISE EXCEPTION 'Invalid certificate settings'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.product_validate_studio_config() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER product_validate_studio_config BEFORE INSERT OR UPDATE ON public.product_studio FOR EACH ROW EXECUTE FUNCTION public.product_validate_studio_config();
COMMIT;
NOTIFY pgrst,'reload schema';
