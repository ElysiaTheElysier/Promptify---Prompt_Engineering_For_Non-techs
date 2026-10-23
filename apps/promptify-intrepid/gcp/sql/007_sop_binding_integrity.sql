-- Forward-only F07. Run with autocommit (CONCURRENTLY cannot run in a transaction).
-- Dirty historical rows cause an explicit failure; never delete/reparent them automatically.
SET lock_timeout='5s';
SET statement_timeout='120s';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.rebuild_sop_bindings b
  JOIN public.rebuild_sop_documents d ON d.id=b.document_id
  JOIN public.rebuild_sop_versions v ON v.id=b.version_id
  WHERE b.class_id<>d.class_id OR b.document_id<>v.document_id)
 THEN RAISE EXCEPTION 'SOP binding mismatch: preserve data and reconcile scope before migration'; END IF;
 IF EXISTS(SELECT 1 FROM public.rebuild_sop_bindings b WHERE NOT public.lesson_belongs_to_class(b.lesson_id,b.class_id))
 THEN RAISE EXCEPTION 'SOP binding lesson outside class course: reconcile existing data before migration'; END IF;
END $$;
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS sop_document_class_identity_uq ON public.rebuild_sop_documents(class_id,id);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS sop_version_document_identity_uq ON public.rebuild_sop_versions(document_id,id);
-- A failed concurrent build can leave an invalid index. Stop for reviewed repair.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_index WHERE indexrelid IN
  ('public.sop_document_class_identity_uq'::regclass,'public.sop_version_document_identity_uq'::regclass)
  AND NOT indisvalid) THEN RAISE EXCEPTION 'Invalid concurrent SOP index: inspect and rebuild before proceeding'; END IF;
 IF EXISTS(SELECT 1 FROM pg_index i JOIN pg_class idx ON idx.oid=i.indexrelid
  WHERE i.indexrelid IN ('public.sop_document_class_identity_uq'::regclass,'public.sop_version_document_identity_uq'::regclass)
  AND (NOT i.indisunique OR i.indpred IS NOT NULL OR i.indexprs IS NOT NULL
   OR i.indnkeyatts<>2 OR i.indnatts<>2
   OR i.indrelid<>CASE idx.relname WHEN 'sop_document_class_identity_uq' THEN 'public.rebuild_sop_documents'::regclass ELSE 'public.rebuild_sop_versions'::regclass END
   OR (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey) WITH ORDINALITY k(attnum,ord) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum)
    <> CASE idx.relname WHEN 'sop_document_class_identity_uq' THEN ARRAY['class_id','id'] ELSE ARRAY['document_id','id'] END))
 THEN RAISE EXCEPTION 'SOP index name exists with incompatible definition; inspect before proceeding'; END IF;
END $$;
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.rebuild_sop_bindings'::regclass AND conname='sop_binding_document_class_fk') THEN
  ALTER TABLE public.rebuild_sop_bindings ADD CONSTRAINT sop_binding_document_class_fk
   FOREIGN KEY(class_id,document_id) REFERENCES public.rebuild_sop_documents(class_id,id) NOT VALID;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.rebuild_sop_bindings'::regclass AND conname='sop_binding_version_document_fk') THEN
  ALTER TABLE public.rebuild_sop_bindings ADD CONSTRAINT sop_binding_version_document_fk
   FOREIGN KEY(document_id,version_id) REFERENCES public.rebuild_sop_versions(document_id,id) NOT VALID;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.product_guard_sop_binding_lesson() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
 -- SHARE conflicts with parent NO KEY UPDATE; serialize a concurrent scope move
 -- before checking its final committed class/module/lesson relationship.
 PERFORM 1 FROM public.classes WHERE id=NEW.class_id FOR SHARE;
 PERFORM 1 FROM public.lessons WHERE id=NEW.lesson_id FOR SHARE;
 PERFORM 1 FROM public.course_modules m JOIN public.lessons l ON l.module_id=m.id WHERE l.id=NEW.lesson_id FOR SHARE OF m;
 IF NOT public.lesson_belongs_to_class(NEW.lesson_id,NEW.class_id) THEN
  RAISE EXCEPTION 'SOP binding lesson outside class course' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.product_guard_sop_binding_lesson() FROM PUBLIC,anon,authenticated;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.rebuild_sop_bindings'::regclass AND tgname='product_guard_sop_binding_lesson') THEN
  CREATE TRIGGER product_guard_sop_binding_lesson BEFORE INSERT OR UPDATE OF class_id,lesson_id
   ON public.rebuild_sop_bindings FOR EACH ROW EXECUTE FUNCTION public.product_guard_sop_binding_lesson();
 END IF;
END $$;
-- Parent moves must preserve the same binding invariant. Deferrable checks allow
-- a reviewed atomic class/module/lesson move when its final state is valid.
CREATE OR REPLACE FUNCTION public.product_guard_sop_binding_parent_scope() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
 IF TG_TABLE_NAME='classes' THEN
  IF EXISTS(SELECT 1 FROM public.rebuild_sop_bindings b WHERE b.class_id=NEW.id AND NOT public.lesson_belongs_to_class(b.lesson_id,b.class_id))
  THEN RAISE EXCEPTION 'Class move invalidates SOP lesson binding' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='lessons' THEN
  IF EXISTS(SELECT 1 FROM public.rebuild_sop_bindings b WHERE b.lesson_id=NEW.id AND NOT public.lesson_belongs_to_class(b.lesson_id,b.class_id))
  THEN RAISE EXCEPTION 'Lesson move invalidates SOP class binding' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='course_modules' THEN
  IF EXISTS(SELECT 1 FROM public.rebuild_sop_bindings b JOIN public.lessons l ON l.id=b.lesson_id WHERE l.module_id=NEW.id AND NOT public.lesson_belongs_to_class(b.lesson_id,b.class_id))
  THEN RAISE EXCEPTION 'Module move invalidates SOP class binding' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.product_guard_sop_binding_parent_scope() FROM PUBLIC,anon,authenticated;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.classes'::regclass AND tgname='sop_binding_class_parent_scope') THEN
  CREATE CONSTRAINT TRIGGER sop_binding_class_parent_scope AFTER UPDATE OF course_id ON public.classes
   DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION public.product_guard_sop_binding_parent_scope();
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.lessons'::regclass AND tgname='sop_binding_lesson_parent_scope') THEN
  CREATE CONSTRAINT TRIGGER sop_binding_lesson_parent_scope AFTER UPDATE OF module_id ON public.lessons
   DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION public.product_guard_sop_binding_parent_scope();
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.course_modules'::regclass AND tgname='sop_binding_module_parent_scope') THEN
  CREATE CONSTRAINT TRIGGER sop_binding_module_parent_scope AFTER UPDATE OF course_id ON public.course_modules
   DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION public.product_guard_sop_binding_parent_scope();
 END IF;
END $$;
COMMIT;
ALTER TABLE public.rebuild_sop_bindings VALIDATE CONSTRAINT sop_binding_document_class_fk;
ALTER TABLE public.rebuild_sop_bindings VALIDATE CONSTRAINT sop_binding_version_document_fk;
RESET lock_timeout;
RESET statement_timeout;
