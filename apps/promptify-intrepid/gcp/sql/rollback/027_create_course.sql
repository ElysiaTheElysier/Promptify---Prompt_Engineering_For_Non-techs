-- Rollback for 027. Courses, clients and classes already created stay (with their audit rows); only the function is removed.
BEGIN;
DROP FUNCTION public.product_create_course(uuid,text,text,text,text,timestamptz,timestamptz);
COMMIT;
