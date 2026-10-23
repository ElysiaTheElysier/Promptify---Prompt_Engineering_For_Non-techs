BEGIN;
CREATE TABLE public.gcp_projection_outbox (
 id bigserial PRIMARY KEY, event_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 entity_table text NOT NULL, entity_key jsonb NOT NULL, class_id uuid, learner_id uuid, previous_version_id uuid,
 operation text NOT NULL CHECK(operation IN ('INSERT','UPDATE','DELETE')),
 created_at timestamptz NOT NULL DEFAULT now(), claimed_at timestamptz, claim_id uuid,
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
 processed_at timestamptz, error_code text, dead_letter_at timestamptz
);
CREATE INDEX gcp_outbox_pending ON public.gcp_projection_outbox(available_at,id) WHERE processed_at IS NULL AND dead_letter_at IS NULL;
ALTER TABLE public.gcp_projection_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gcp_projection_outbox FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gcp_projection_outbox TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.gcp_projection_outbox_id_seq TO service_role;
CREATE POLICY gcp_outbox_backend ON public.gcp_projection_outbox TO service_role USING(true) WITH CHECK(true);
CREATE FUNCTION public.gcp_queue_projection() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE row_data jsonb; old_data jsonb; key_data jsonb:='{}'::jsonb; key_name text;
BEGIN
 old_data:=CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
 row_data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 FOREACH key_name IN ARRAY TG_ARGV LOOP key_data:=key_data||jsonb_build_object(key_name,row_data->key_name); END LOOP;
 INSERT INTO public.gcp_projection_outbox(entity_table,entity_key,class_id,learner_id,previous_version_id,operation)
 VALUES(TG_TABLE_NAME,key_data,nullif(row_data->>'class_id','')::uuid,nullif(row_data->>'learner_id','')::uuid,CASE WHEN TG_TABLE_NAME='rebuild_sop_versions' THEN nullif(old_data->>'id','')::uuid ELSE nullif(old_data->>'version_id','')::uuid END,TG_OP);
 RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.gcp_queue_projection() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER gcp_projection_classes AFTER INSERT OR UPDATE OR DELETE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('id');
CREATE TRIGGER gcp_projection_courses AFTER INSERT OR UPDATE OR DELETE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('id');
CREATE TRIGGER gcp_projection_course_modules AFTER INSERT OR UPDATE OR DELETE ON public.course_modules FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('id');
CREATE TRIGGER gcp_projection_lessons AFTER INSERT OR UPDATE OR DELETE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('id');
CREATE TRIGGER gcp_projection_enrollments AFTER INSERT OR UPDATE OR DELETE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('id');
CREATE TRIGGER gcp_projection_course_instructors AFTER INSERT OR UPDATE OR DELETE ON public.course_instructors FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('course_id','user_id');
CREATE TRIGGER gcp_projection_product_class_grants AFTER INSERT OR UPDATE OR DELETE ON public.product_class_grants FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('user_id','class_id');
CREATE TRIGGER gcp_projection_product_domains AFTER INSERT OR UPDATE OR DELETE ON public.product_domains FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('client_id','domain');
CREATE TRIGGER gcp_projection_gcp_identity_bindings AFTER INSERT OR UPDATE OR DELETE ON public.gcp_identity_bindings FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('issuer','external_subject');
CREATE TRIGGER gcp_projection_prompt_attempts AFTER INSERT OR UPDATE OR DELETE ON public.prompt_attempts FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('id');
CREATE TRIGGER gcp_projection_lesson_progress AFTER INSERT OR UPDATE OR DELETE ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('id');
CREATE TRIGGER gcp_projection_product_attendance AFTER INSERT OR UPDATE OR DELETE ON public.product_attendance FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('class_id','lesson_id','learner_id');
CREATE TRIGGER gcp_projection_product_awards AFTER INSERT OR UPDATE OR DELETE ON public.product_awards FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('id');
CREATE TRIGGER gcp_projection_workshop_messages AFTER INSERT OR UPDATE OR DELETE ON public.workshop_messages FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('id');
CREATE TRIGGER gcp_projection_trainer_hints AFTER INSERT OR UPDATE OR DELETE ON public.trainer_hints FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('id');
CREATE TRIGGER gcp_projection_product_session_controls AFTER INSERT OR UPDATE OR DELETE ON public.product_session_controls FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('class_id');
CREATE TRIGGER gcp_projection_product_sync_logs AFTER INSERT OR UPDATE OR DELETE ON public.product_sync_logs FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('id');
CREATE TRIGGER gcp_projection_product_sop_contributions AFTER INSERT OR UPDATE OR DELETE ON public.product_sop_contributions FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('id');
CREATE TRIGGER gcp_projection_product_sop_chunks AFTER INSERT OR UPDATE OR DELETE ON public.product_sop_chunks FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('version_id','"position"');
CREATE TRIGGER gcp_projection_rebuild_sop_versions AFTER INSERT OR UPDATE OR DELETE ON public.rebuild_sop_versions FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('id');
CREATE TRIGGER gcp_projection_rebuild_sop_bindings AFTER INSERT OR UPDATE OR DELETE ON public.rebuild_sop_bindings FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('class_id','lesson_id','document_id');
CREATE TRIGGER gcp_projection_users AFTER INSERT OR UPDATE OR DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION public.gcp_queue_projection('id');
COMMIT;
