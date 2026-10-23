BEGIN;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS google_ml_integration WITH SCHEMA public;
-- Preserve imported JSON evidence; derive the indexed float32 vector without rewriting history.
ALTER TABLE public.product_sop_chunks ADD COLUMN embedding_vector public.vector(768)
 GENERATED ALWAYS AS (embedding::text::public.vector(768)) STORED;
ALTER TABLE public.product_sop_chunks ALTER COLUMN model SET DEFAULT 'text-multilingual-embedding-002';
CREATE INDEX product_sop_chunks_embedding_hnsw ON public.product_sop_chunks
 USING hnsw (embedding_vector public.vector_cosine_ops);
CREATE OR REPLACE FUNCTION public.intrepid_embed_text(p_text text) RETURNS real[]
 LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE result real[];
BEGIN
 IF p_text IS NULL OR length(p_text) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Embedding text length must be 1..2000'; END IF;
 result:=public.embedding('text-multilingual-embedding-002',p_text);
 IF cardinality(result)<>768 THEN RAISE EXCEPTION 'Expected 768 embedding dimensions'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.intrepid_embed_text(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intrepid_embed_text(text) TO service_role;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='embedding'
 LOOP EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature); END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.intrepid_search_sop(p_class uuid,p_lesson uuid,p_versions uuid[],p_vector jsonb)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE allowed jsonb; query_vector public.vector(768); output jsonb;
BEGIN
 allowed:=public.rebuild_class_sops(p_class,p_lesson); -- Validates current identity/class/lesson bindings.
 IF jsonb_typeof(p_vector) IS DISTINCT FROM 'array' OR jsonb_array_length(p_vector)<>768 THEN RAISE EXCEPTION 'Invalid query vector'; END IF;
 query_vector:=p_vector::text::public.vector(768);
 IF public.vector_norm(query_vector)=0 THEN RAISE EXCEPTION 'Zero query vector'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.distance),'[]'::jsonb) INTO output FROM (
 SELECT ch.version_id,ch.position,ch.page,ch.content,ch.model,v.title,
 1-(ch.embedding_vector <=> query_vector) AS similarity,
 ch.embedding_vector <=> query_vector AS distance,
 v.citation||CASE WHEN ch.page IS NULL THEN '' ELSE ' [Page '||ch.page||']' END AS citation
 FROM public.product_sop_chunks ch
 JOIN jsonb_to_recordset(allowed) AS v(version_id uuid,title text,citation text) ON v.version_id=ch.version_id
 WHERE ch.version_id=ANY(p_versions) AND ch.model='text-multilingual-embedding-002'
 AND (NOT EXISTS(SELECT 1 FROM public.product_sop_contributions c WHERE c.version_id=ch.version_id)
 OR EXISTS(SELECT 1 FROM public.product_sop_contributions c WHERE c.version_id=ch.version_id AND c.status='published'))
 ORDER BY ch.embedding_vector <=> query_vector LIMIT 10
 ) r;
 RETURN output;
END $$;
REVOKE ALL ON FUNCTION public.intrepid_search_sop(uuid,uuid,uuid[],jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intrepid_search_sop(uuid,uuid,uuid[],jsonb) TO authenticated;
COMMIT;
