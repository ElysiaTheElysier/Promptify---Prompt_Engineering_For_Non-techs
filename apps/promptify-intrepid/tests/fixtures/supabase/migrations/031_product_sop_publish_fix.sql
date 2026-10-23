BEGIN;
CREATE OR REPLACE FUNCTION public.product_publish_contribution(p_contribution uuid,p_chunks jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE source public.product_sop_contributions;v_version_id uuid;
BEGIN
 SELECT * INTO STRICT source FROM public.product_sop_contributions WHERE id=p_contribution FOR UPDATE;
 IF NOT public.product_can_manage(source.class_id) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF source.status='published' THEN RETURN source.version_id; END IF;
 IF source.status<>'pending' THEN RAISE EXCEPTION 'Contribution is not pending'; END IF;
 IF jsonb_typeof(p_chunks) IS DISTINCT FROM 'array' OR jsonb_array_length(p_chunks)<>jsonb_array_length(source.chunks) THEN RAISE EXCEPTION 'Chunk count mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_chunks) c WHERE jsonb_typeof(c->'embedding') IS DISTINCT FROM 'array' OR jsonb_array_length(c->'embedding')<>768 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(source.chunks) s WHERE s->>'position'=c->>'position' AND s->>'content'=c->>'content' AND s->'page' IS NOT DISTINCT FROM c->'page')) THEN RAISE EXCEPTION 'Indexed source mismatch'; END IF;
 v_version_id:=public.rebuild_publish_sop(source.class_id,source.document_id,source.title,source.content,source.lesson_id);
 INSERT INTO public.product_sop_chunks(version_id,position,page,content,embedding)
 SELECT v_version_id,(c->>'position')::integer,(c->>'page')::integer,c->>'content',c->'embedding' FROM jsonb_array_elements(p_chunks) c;
 UPDATE public.product_sop_contributions SET status='published',version_id=v_version_id,reviewed_by=public.current_user_id() WHERE id=p_contribution;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(source.class_id,public.current_user_id(),'sop.publish',source.title||' / '||v_version_id);
 RETURN v_version_id;
END $$;
COMMIT;
NOTIFY pgrst,'reload schema';
