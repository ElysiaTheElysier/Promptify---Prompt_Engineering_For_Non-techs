-- Forward-only F02/N02/model provenance. No historical event/vector relabel or deletion.
-- Deploy mixed-key consumer + model-aware producer before this migration.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
ALTER TABLE public.product_sop_contributions ADD COLUMN IF NOT EXISTS indexing_claimed_at timestamptz;
DROP TRIGGER IF EXISTS gcp_projection_product_sop_chunks ON public.product_sop_chunks;
CREATE TRIGGER gcp_projection_product_sop_chunks AFTER INSERT OR UPDATE OR DELETE ON public.product_sop_chunks
 FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('version_id','position');
DROP TRIGGER IF EXISTS gcp_projection_product_studio ON public.product_studio;
CREATE TRIGGER gcp_projection_product_studio AFTER INSERT OR UPDATE OR DELETE ON public.product_studio
 FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('class_id','lesson_id');
CREATE OR REPLACE FUNCTION public.product_publish_contribution(p_contribution uuid, p_chunks jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE source public.product_sop_contributions;v_version_id uuid;
BEGIN
 SELECT * INTO STRICT source FROM public.product_sop_contributions WHERE id=p_contribution FOR UPDATE;
 IF NOT public.product_can_manage(source.class_id) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF source.status='published' THEN RETURN source.version_id; END IF;
 IF source.status<>'pending' THEN RAISE EXCEPTION 'Contribution is not pending'; END IF;
 IF jsonb_typeof(p_chunks) IS DISTINCT FROM 'array' OR jsonb_array_length(p_chunks)<>jsonb_array_length(source.chunks) THEN RAISE EXCEPTION 'Chunk count mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_chunks) c WHERE jsonb_typeof(c->'embedding') IS DISTINCT FROM 'array' OR jsonb_array_length(c->'embedding')<>768 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(source.chunks) s WHERE s->>'position'=c->>'position' AND s->>'content'=c->>'content' AND s->'page' IS NOT DISTINCT FROM c->'page')) THEN RAISE EXCEPTION 'Indexed source mismatch'; END IF;
 -- Preserve producer model provenance; dimensions alone cannot establish a model space.
 -- Legacy cached chunks without provenance require explicit re-index/reconciliation.
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_chunks) c WHERE
   nullif(c->>'model','') IS NULL OR length(c->>'model')>160
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(c->'embedding') e WHERE jsonb_typeof(e)<>'number')
   OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c->'embedding') e WHERE (e::text)::numeric<>0))
 THEN RAISE EXCEPTION 'Embedding provenance or vector invalid; reconcile indexed evidence'; END IF;
 IF (SELECT count(DISTINCT c->>'model') FROM jsonb_array_elements(p_chunks) c)<>1
 THEN RAISE EXCEPTION 'Mixed embedding model spaces'; END IF;
 v_version_id:=public.rebuild_publish_sop(source.class_id,source.document_id,source.title,source.content,source.lesson_id);
 INSERT INTO public.product_sop_chunks(version_id,position,page,content,embedding,model)
 SELECT v_version_id,(c->>'position')::integer,(c->>'page')::integer,c->>'content',c->'embedding',c->>'model' FROM jsonb_array_elements(p_chunks) c;
 UPDATE public.product_sop_contributions SET status='published',version_id=v_version_id,reviewed_by=public.current_user_id() WHERE id=p_contribution;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(source.class_id,public.current_user_id(),'sop.publish',source.title||' / '||v_version_id);
 RETURN v_version_id;
END $$;
COMMIT;
