-- Disable GENERATION_MODE and drain active tasks before rollback. Keep saved attempts.
BEGIN;
DROP FUNCTION public.product_freeze_generation_context(uuid,uuid,uuid,jsonb);
DROP FUNCTION public.product_generation_retrieve(uuid,uuid,uuid,text,uuid[],jsonb);
DROP FUNCTION public.product_confirm_generation_dispatch(uuid,uuid,integer);
DROP FUNCTION public.product_generation_status(uuid,uuid,uuid,uuid);
DROP FUNCTION public.product_enqueue_generation(uuid,uuid,uuid,uuid,text,jsonb,text),public.product_lease_generation(uuid,uuid,text,uuid),public.product_finish_generation(uuid,uuid,uuid,jsonb),public.product_fail_generation(uuid,uuid,uuid,boolean,text);
DROP TABLE public.product_generation_jobs;
COMMIT;
