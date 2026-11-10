-- Rollback for 026. Pending and approved requests are dropped; staff accounts bind on first sign-in by email again.
-- Bindings already made and audit rows stay.
BEGIN;
DROP FUNCTION public.product_approve_identity_link(uuid,text);
DROP TABLE public.product_identity_link_requests;
COMMIT;
