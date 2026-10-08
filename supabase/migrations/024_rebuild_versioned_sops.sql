BEGIN;
CREATE TABLE public.rebuild_sop_documents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),class_id uuid NOT NULL REFERENCES public.classes,title text NOT NULL CHECK(length(btrim(title)) BETWEEN 2 AND 160),created_by uuid NOT NULL REFERENCES public.users DEFAULT public.current_user_id(),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.rebuild_sop_versions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),document_id uuid NOT NULL REFERENCES public.rebuild_sop_documents,version integer NOT NULL CHECK(version>0),content text NOT NULL CHECK(length(content) BETWEEN 1 AND 100000),created_by uuid NOT NULL REFERENCES public.users DEFAULT public.current_user_id(),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(document_id,version));
CREATE TABLE public.rebuild_sop_bindings(class_id uuid NOT NULL REFERENCES public.classes,lesson_id uuid NOT NULL REFERENCES public.lessons,document_id uuid NOT NULL REFERENCES public.rebuild_sop_documents,version_id uuid NOT NULL REFERENCES public.rebuild_sop_versions,PRIMARY KEY(class_id,lesson_id,document_id));
ALTER TABLE public.rebuild_sop_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rebuild_sop_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rebuild_sop_bindings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rebuild_sop_documents,public.rebuild_sop_versions,public.rebuild_sop_bindings FROM anon,authenticated;
CREATE FUNCTION public.rebuild_publish_sop(p_class uuid,p_document uuid,p_title text,p_content text,p_lesson uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE doc_id uuid; version_id uuid; version_number integer;
BEGIN
 IF NOT public.rebuild_can_manage_class(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF p_lesson IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.classes c JOIN public.course_modules m ON m.course_id=c.course_id JOIN public.lessons l ON l.module_id=m.id WHERE c.id=p_class AND l.id=p_lesson) THEN RAISE EXCEPTION 'Lesson does not belong to class course'; END IF;
 IF p_document IS NULL THEN INSERT INTO public.rebuild_sop_documents(class_id,title) VALUES(p_class,btrim(p_title)) RETURNING id INTO doc_id;
 ELSE SELECT id INTO STRICT doc_id FROM public.rebuild_sop_documents WHERE id=p_document AND class_id=p_class FOR UPDATE; END IF;
 SELECT coalesce(max(version),0)+1 INTO version_number FROM public.rebuild_sop_versions WHERE document_id=doc_id;
 INSERT INTO public.rebuild_sop_versions(document_id,version,content) VALUES(doc_id,version_number,p_content) RETURNING id INTO version_id;
 IF p_lesson IS NOT NULL THEN INSERT INTO public.rebuild_sop_bindings(class_id,lesson_id,document_id,version_id) VALUES(p_class,p_lesson,doc_id,version_id) ON CONFLICT(class_id,lesson_id,document_id) DO UPDATE SET version_id=excluded.version_id; END IF;
 RETURN version_id;
END $$;
CREATE FUNCTION public.rebuild_class_sops(p_class uuid,p_lesson uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT(public.rebuild_can_teach(p_class) OR public.has_active_class_enrollment(p_class)) THEN RAISE EXCEPTION 'Class access required'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.title,s.version DESC),'[]'::jsonb) FROM (
 SELECT d.id AS document_id,d.title,v.id AS version_id,v.version,v.content,v.created_at,
 '[SOP:'||v.id::text||':v'||v.version::text||']' AS citation
 FROM public.rebuild_sop_documents d JOIN public.rebuild_sop_versions v ON v.document_id=d.id
 WHERE d.class_id=p_class AND (p_lesson IS NULL OR EXISTS(SELECT 1 FROM public.rebuild_sop_bindings b WHERE b.class_id=p_class AND b.lesson_id=p_lesson AND b.version_id=v.id))
 AND (public.rebuild_can_teach(p_class) OR EXISTS(SELECT 1 FROM public.rebuild_sop_bindings b JOIN public.lessons l ON l.id=b.lesson_id JOIN public.course_modules m ON m.id=l.module_id WHERE b.class_id=p_class AND b.version_id=v.id AND l.status='published' AND m.status='published'))
 ) s);
END $$;
CREATE FUNCTION public.rebuild_sop_lesson_options(p_class uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.rebuild_can_manage_class(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'title',l.title) ORDER BY m.position,l.position),'[]'::jsonb) FROM public.classes c JOIN public.course_modules m ON m.course_id=c.course_id JOIN public.lessons l ON l.module_id=m.id WHERE c.id=p_class);
END $$;
REVOKE ALL ON FUNCTION public.rebuild_publish_sop(uuid,uuid,text,text,uuid),public.rebuild_class_sops(uuid,uuid),public.rebuild_sop_lesson_options(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rebuild_publish_sop(uuid,uuid,text,text,uuid),public.rebuild_class_sops(uuid,uuid),public.rebuild_sop_lesson_options(uuid) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
