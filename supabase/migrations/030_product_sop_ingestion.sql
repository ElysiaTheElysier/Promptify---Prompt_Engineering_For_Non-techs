BEGIN;
CREATE TABLE public.product_sop_contributions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL REFERENCES public.users,
 request_id uuid NOT NULL,class_id uuid NOT NULL REFERENCES public.classes,lesson_id uuid NOT NULL REFERENCES public.lessons,
 document_id uuid REFERENCES public.rebuild_sop_documents,title text NOT NULL CHECK(length(btrim(title)) BETWEEN 2 AND 160),
 content text NOT NULL CHECK(length(content) BETWEEN 1 AND 100000),metadata jsonb NOT NULL,chunks jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','rejected')),
 version_id uuid REFERENCES public.rebuild_sop_versions,reviewed_by uuid REFERENCES public.users,review_reason text,
 indexing_claim uuid,indexed_chunks jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(actor_id,request_id)
);
CREATE TABLE public.product_sop_chunks(
 version_id uuid NOT NULL REFERENCES public.rebuild_sop_versions,position integer NOT NULL CHECK(position BETWEEN 1 AND 60),
 page integer,content text NOT NULL CHECK(length(content) BETWEEN 1 AND 2000),
 embedding jsonb NOT NULL CHECK(jsonb_typeof(embedding)='array' AND jsonb_array_length(embedding)=768),
 model text NOT NULL DEFAULT 'gemini-embedding-001',indexed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(version_id,position)
);
DO $$ DECLARE item text; BEGIN
 FOREACH item IN ARRAY ARRAY['product_sop_contributions','product_sop_chunks'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',item);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',item);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',item);
 END LOOP;
END $$;
CREATE FUNCTION public.product_publish_contribution(p_contribution uuid,p_chunks jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE source public.product_sop_contributions;version_id uuid;
BEGIN
 SELECT * INTO STRICT source FROM public.product_sop_contributions WHERE id=p_contribution FOR UPDATE;
 IF NOT public.product_can_manage(source.class_id) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF source.status='published' THEN RETURN source.version_id; END IF;
 IF source.status<>'pending' THEN RAISE EXCEPTION 'Contribution is not pending'; END IF;
 IF jsonb_typeof(p_chunks) IS DISTINCT FROM 'array' OR jsonb_array_length(p_chunks)<>jsonb_array_length(source.chunks) THEN RAISE EXCEPTION 'Chunk count mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_chunks) c WHERE jsonb_typeof(c->'embedding') IS DISTINCT FROM 'array' OR jsonb_array_length(c->'embedding')<>768 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(source.chunks) s WHERE s->>'position'=c->>'position' AND s->>'content'=c->>'content' AND s->'page' IS NOT DISTINCT FROM c->'page')) THEN RAISE EXCEPTION 'Indexed source mismatch'; END IF;
 version_id:=public.rebuild_publish_sop(source.class_id,source.document_id,source.title,source.content,source.lesson_id);
 INSERT INTO public.product_sop_chunks(version_id,position,page,content,embedding)
 SELECT version_id,(c->>'position')::integer,(c->>'page')::integer,c->>'content',c->'embedding' FROM jsonb_array_elements(p_chunks) c;
 UPDATE public.product_sop_contributions SET status='published',version_id=product_publish_contribution.version_id,reviewed_by=public.current_user_id() WHERE id=p_contribution;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(source.class_id,public.current_user_id(),'sop.publish',source.title||' / '||version_id);
 RETURN version_id;
END $$;
REVOKE ALL ON FUNCTION public.product_publish_contribution(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.product_publish_contribution(uuid,jsonb) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
