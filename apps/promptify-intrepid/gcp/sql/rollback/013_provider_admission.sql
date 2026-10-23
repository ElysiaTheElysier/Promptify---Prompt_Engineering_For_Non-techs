-- Stop/disable admission callers and drain all active work BEFORE rollback.
BEGIN;
DROP FUNCTION public.product_provider_settle(uuid,integer,integer,integer);
DROP FUNCTION public.product_provider_acquire(uuid,integer);
DROP FUNCTION public.product_provider_enqueue(uuid,text,uuid,integer,integer);
DROP TABLE public.product_provider_calls;
DROP TABLE public.product_provider_budget;
COMMIT;
