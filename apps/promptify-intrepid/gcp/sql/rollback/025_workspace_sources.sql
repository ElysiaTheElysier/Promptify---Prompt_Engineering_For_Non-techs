-- Rollback for 025. Approvals stored here are lost; the server falls back to WORKSPACE_SOURCE_BINDINGS_JSON only.
-- Audit rows (source.approve / source.revoke) stay.
BEGIN;
DROP FUNCTION public.product_set_workspace_source(uuid,text,text,boolean,text);
DROP TABLE public.product_workspace_sources;
COMMIT;
