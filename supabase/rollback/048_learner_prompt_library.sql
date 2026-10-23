-- Manual rollback only. Export the two new tables before running: this removes new library/context data.
BEGIN;
DROP FUNCTION public.product_unlock_support_reflected(uuid,uuid,text,text);
GRANT EXECUTE ON FUNCTION public.product_unlock_support(uuid,uuid,text) TO authenticated;
ALTER TABLE public.product_learner_support DROP COLUMN reflection;
DROP TABLE public.product_learner_context;
DROP TABLE public.product_prompt_library;
DELETE FROM supabase_migrations.schema_migrations WHERE version='048';
COMMIT;
NOTIFY pgrst,'reload schema';
