-- Rollback for 023. Revokes already made stay (removed grants, audit rows); only the function is removed.
BEGIN;
DROP FUNCTION public.product_revoke_class_access(uuid,uuid,text,text);
COMMIT;
