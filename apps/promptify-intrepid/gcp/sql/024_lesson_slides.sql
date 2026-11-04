-- 024: lecture slides per class (additive). A class owns decks; each deck has immutable PDF versions and at most one
-- published version. Each class has at most one default deck. Assignments belong to the class+lesson pair because two
-- classes can share a course lesson. Composite keys keep every deck/version/assignment inside one class even when IDs
-- are supplied directly; the lesson trigger keeps assignments inside the class course. Tables are service-only (the API
-- authorizes reads); every mutation goes through an editor-checked function serialized per class.
BEGIN;
CREATE TABLE public.product_slide_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 160),
  is_default boolean NOT NULL DEFAULT false,
  published_version_id uuid,
  created_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, class_id),
  CHECK (NOT is_default OR published_version_id IS NOT NULL)
);
CREATE UNIQUE INDEX product_slide_decks_one_default ON public.product_slide_decks (class_id) WHERE is_default;
CREATE TABLE public.product_slide_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL,
  class_id uuid NOT NULL,
  request_id uuid NOT NULL,
  source_kind text NOT NULL CHECK (source_kind IN ('upload','drive_pdf','drive_slides')),
  drive_file_id text CHECK (drive_file_id ~ '^[A-Za-z0-9_-]{1,200}$'),
  storage_path text NOT NULL UNIQUE CHECK (length(storage_path) BETWEEN 1 AND 500),
  storage_generation text,
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 26214400),
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  page_count integer NOT NULL CHECK (page_count BETWEEN 1 AND 2000),
  created_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (class_id, request_id),
  UNIQUE (id, deck_id),
  FOREIGN KEY (deck_id, class_id) REFERENCES public.product_slide_decks (id, class_id) ON DELETE CASCADE,
  CHECK ((source_kind = 'upload') = (drive_file_id IS NULL))
);
CREATE INDEX product_slide_versions_deck_idx ON public.product_slide_versions (deck_id, created_at DESC);
-- The published version must be a version of the same deck (and therefore the same class).
ALTER TABLE public.product_slide_decks ADD CONSTRAINT product_slide_decks_published_fk
  FOREIGN KEY (published_version_id, id) REFERENCES public.product_slide_versions (id, deck_id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE public.product_lesson_slides (
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons (id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('inherit','deck','off')),
  deck_id uuid,
  start_page integer CHECK (start_page BETWEEN 1 AND 2000),
  end_page integer CHECK (end_page BETWEEN 1 AND 2000),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, lesson_id),
  -- No cascade: a deck in use cannot disappear and leave a broken link (product_slide_remove_deck reassigns first).
  FOREIGN KEY (deck_id, class_id) REFERENCES public.product_slide_decks (id, class_id),
  CHECK ((mode = 'deck') = (deck_id IS NOT NULL)),
  CHECK (end_page IS NULL OR start_page IS NOT NULL AND end_page >= start_page),
  CHECK (mode <> 'off' OR start_page IS NULL)
);
CREATE INDEX product_lesson_slides_deck_idx ON public.product_lesson_slides (deck_id) WHERE deck_id IS NOT NULL;
CREATE FUNCTION public.product_lesson_slides_scope() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.classes c JOIN public.course_modules m ON m.course_id=c.course_id JOIN public.lessons l ON l.module_id=m.id WHERE c.id=NEW.class_id AND l.id=NEW.lesson_id) THEN RAISE EXCEPTION 'Lesson outside course'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER product_lesson_slides_scope BEFORE INSERT OR UPDATE OF class_id, lesson_id ON public.product_lesson_slides FOR EACH ROW EXECUTE FUNCTION public.product_lesson_slides_scope();
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['product_slide_decks','product_slide_versions','product_lesson_slides'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
  EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role', t);
  EXECUTE format('CREATE POLICY service_only ON public.%I TO service_role USING (true) WITH CHECK (true)', t);
 END LOOP;
END $$;

-- Editors of the class (owner/editor on its course) or a system administrator. Also serializes slide changes per class.
CREATE FUNCTION public.product_slides_begin(p_class uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
 IF NOT (public.product_can_manage(p_class) OR EXISTS(SELECT 1 FROM public.users WHERE id=public.current_user_id() AND role='admin')) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_class::text,2024));
END $$;
-- Pages of the deck a lesson currently shows (explicit deck, or the class default when inheriting); NULL when none.
CREATE FUNCTION public.product_slides_effective_pages(p_class uuid, p_mode text, p_deck uuid) RETURNS integer LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp' AS $$
 SELECT v.page_count FROM public.product_slide_decks d JOIN public.product_slide_versions v ON v.id=d.published_version_id
 WHERE d.class_id=p_class AND (p_mode='deck' AND d.id=p_deck OR p_mode='inherit' AND d.is_default);
$$;
-- Every assignment that follows p_deck (explicitly, or by inheriting it as the default) must fit p_pages.
CREATE FUNCTION public.product_slides_assert_ranges(p_class uuid, p_deck uuid, p_default boolean, p_pages integer) RETURNS void LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.product_lesson_slides s WHERE s.class_id=p_class AND (s.mode='deck' AND s.deck_id=p_deck OR s.mode='inherit' AND p_default)
   AND (s.start_page>p_pages OR s.end_page>p_pages)) THEN RAISE EXCEPTION 'Page range exceeds deck'; END IF;
END $$;

CREATE FUNCTION public.product_slide_add_version(p_class uuid, p_request uuid, p_deck uuid, p_title text, p_source text, p_drive_file text, p_path text, p_generation text, p_size integer, p_sha256 text, p_pages integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE prior public.product_slide_versions; deck uuid:=p_deck; created uuid;
BEGIN
 PERFORM public.product_slides_begin(p_class);
 SELECT * INTO prior FROM public.product_slide_versions WHERE class_id=p_class AND request_id=p_request;
 IF FOUND THEN
  -- A retried request returns the version it already created; a different file under the same request is a conflict.
  IF prior.storage_path<>p_path OR prior.sha256<>p_sha256 OR p_deck IS NOT NULL AND prior.deck_id<>p_deck THEN RAISE EXCEPTION 'Slide request conflict'; END IF;
  RETURN jsonb_build_object('deckId',prior.deck_id,'versionId',prior.id,'pageCount',prior.page_count);
 END IF;
 IF deck IS NULL THEN
  IF p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 1 AND 160 THEN RAISE EXCEPTION 'Deck title required'; END IF;
  INSERT INTO public.product_slide_decks(class_id,title,created_by) VALUES(p_class,btrim(p_title),public.current_user_id()) RETURNING id INTO deck;
 ELSIF NOT EXISTS(SELECT 1 FROM public.product_slide_decks WHERE id=deck AND class_id=p_class) THEN RAISE EXCEPTION 'Slide deck outside class';
 END IF;
 INSERT INTO public.product_slide_versions(deck_id,class_id,request_id,source_kind,drive_file_id,storage_path,storage_generation,size_bytes,sha256,page_count,created_by)
  VALUES(deck,p_class,p_request,p_source,p_drive_file,p_path,p_generation,p_size,p_sha256,p_pages,public.current_user_id()) RETURNING id INTO created;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'slides.version','Deck '||deck||' draft '||created||' ('||p_pages||' pages)');
 RETURN jsonb_build_object('deckId',deck,'versionId',created,'pageCount',p_pages);
END $$;

-- Publishes a draft and the reviewed page ranges together. p_expected is the version the editor reviewed against, so
-- a second editor publishing at the same time gets a conflict instead of silently replacing it. Re-publishing the
-- already published version is a no-op (double-click / retry after a network error).
CREATE FUNCTION public.product_slide_publish(p_class uuid, p_version uuid, p_expected uuid, p_ranges jsonb, p_title text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE target public.product_slide_versions; current public.product_slide_decks; item jsonb; first integer; last integer; n integer; changed integer:=0;
BEGIN
 PERFORM public.product_slides_begin(p_class);
 SELECT * INTO target FROM public.product_slide_versions WHERE id=p_version AND class_id=p_class;
 IF NOT FOUND THEN RAISE EXCEPTION 'Slide version outside class'; END IF;
 SELECT * INTO current FROM public.product_slide_decks WHERE id=target.deck_id FOR UPDATE;
 IF current.published_version_id=p_version THEN RETURN jsonb_build_object('deckId',current.id,'versionId',p_version,'unchanged',true); END IF;
 IF current.published_version_id IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'Slide deck changed; reload'; END IF;
 IF jsonb_typeof(coalesce(p_ranges,'[]'::jsonb))<>'array' OR jsonb_array_length(coalesce(p_ranges,'[]'::jsonb))>500 THEN RAISE EXCEPTION 'Invalid page ranges'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(coalesce(p_ranges,'[]'::jsonb)) LOOP
  first:=CASE WHEN jsonb_typeof(item->'start')='number' THEN (item->>'start')::integer END;
  last:=CASE WHEN jsonb_typeof(item->'end')='number' THEN (item->>'end')::integer END;
  IF last IS NOT NULL AND first IS NULL THEN RAISE EXCEPTION 'Invalid page ranges'; END IF;
  UPDATE public.product_lesson_slides SET start_page=first,end_page=last,revision=revision+1,updated_by=public.current_user_id(),updated_at=now()
   WHERE class_id=p_class AND lesson_id=(item->>'lessonId')::uuid AND (mode='deck' AND deck_id=current.id OR mode='inherit' AND current.is_default)
   AND (start_page IS DISTINCT FROM first OR end_page IS DISTINCT FROM last);
  GET DIAGNOSTICS n = ROW_COUNT; changed:=changed+n;
 END LOOP;
 PERFORM public.product_slides_assert_ranges(p_class,current.id,current.is_default,target.page_count);
 UPDATE public.product_slide_decks SET published_version_id=p_version,title=coalesce(nullif(btrim(p_title),''),title),updated_at=now() WHERE id=current.id;
 UPDATE public.product_slide_versions SET published_at=now() WHERE id=p_version;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'slides.publish','Deck '||current.id||' version '||p_version||'; ranges changed '||changed);
 RETURN jsonb_build_object('deckId',current.id,'versionId',p_version,'rangesChanged',changed);
END $$;

-- p_deck NULL clears the default. Inheriting lessons must fit the new default before it is applied.
CREATE FUNCTION public.product_slide_set_default(p_class uuid, p_deck uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE pages integer;
BEGIN
 PERFORM public.product_slides_begin(p_class);
 IF p_deck IS NOT NULL THEN
  SELECT v.page_count INTO pages FROM public.product_slide_decks d JOIN public.product_slide_versions v ON v.id=d.published_version_id WHERE d.id=p_deck AND d.class_id=p_class;
  IF pages IS NULL THEN RAISE EXCEPTION 'Publish the deck before making it the default'; END IF;
  PERFORM public.product_slides_assert_ranges(p_class,NULL,true,pages);
 END IF;
 UPDATE public.product_slide_decks SET is_default=false,updated_at=now() WHERE class_id=p_class AND is_default AND id IS DISTINCT FROM p_deck;
 IF p_deck IS NOT NULL THEN UPDATE public.product_slide_decks SET is_default=true,updated_at=now() WHERE id=p_deck; END IF;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'slides.default',coalesce('Deck '||p_deck,'No default deck'));
 RETURN jsonb_build_object('defaultDeckId',p_deck);
END $$;

-- Lesson assignment with an optimistic revision (0 = no row yet). Ranges are checked against the deck the lesson shows;
-- when no published deck applies yet, the range is checked later by publish/default changes.
CREATE FUNCTION public.product_slide_save_lesson(p_class uuid, p_lesson uuid, p_expected_revision integer, p_mode text, p_deck uuid, p_start integer, p_end integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE current_revision integer; pages integer;
BEGIN
 PERFORM public.product_slides_begin(p_class);
 IF p_mode IS NULL OR p_mode NOT IN ('inherit','deck','off') THEN RAISE EXCEPTION 'Invalid slide mode'; END IF;
 IF p_mode='deck' AND NOT EXISTS(SELECT 1 FROM public.product_slide_decks WHERE id=p_deck AND class_id=p_class AND published_version_id IS NOT NULL) THEN RAISE EXCEPTION 'Choose a published deck of this class'; END IF;
 IF p_mode='off' THEN p_start:=NULL;p_end:=NULL; END IF;
 IF p_mode<>'deck' THEN p_deck:=NULL; END IF;
 IF p_end IS NOT NULL AND (p_start IS NULL OR p_end<p_start) OR p_start<1 THEN RAISE EXCEPTION 'Invalid page range'; END IF;
 SELECT revision INTO current_revision FROM public.product_lesson_slides WHERE class_id=p_class AND lesson_id=p_lesson FOR UPDATE;
 IF coalesce(current_revision,0) IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'Revision conflict'; END IF;
 pages:=public.product_slides_effective_pages(p_class,p_mode,p_deck);
 IF pages IS NOT NULL AND (p_start>pages OR p_end>pages) THEN RAISE EXCEPTION 'Page range exceeds deck'; END IF;
 INSERT INTO public.product_lesson_slides(class_id,lesson_id,mode,deck_id,start_page,end_page,revision,updated_by)
  VALUES(p_class,p_lesson,p_mode,p_deck,p_start,p_end,coalesce(current_revision,0)+1,public.current_user_id())
  ON CONFLICT(class_id,lesson_id) DO UPDATE SET mode=excluded.mode,deck_id=excluded.deck_id,start_page=excluded.start_page,end_page=excluded.end_page,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now();
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'slides.lesson','Lesson '||p_lesson||' '||p_mode||' revision '||(coalesce(current_revision,0)+1));
 RETURN jsonb_build_object('revision',coalesce(current_revision,0)+1,'lessonId',p_lesson);
END $$;

-- Removing a deck in use needs a replacement (explicit lessons move to it with the whole deck; a removed default is
-- replaced as default) or confirmation that those lessons turn slides off. Stored PDF objects stay immutable.
CREATE FUNCTION public.product_slide_remove_deck(p_class uuid, p_deck uuid, p_replacement uuid, p_confirm_off boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE target public.product_slide_decks; affected integer;
BEGIN
 PERFORM public.product_slides_begin(p_class);
 SELECT * INTO target FROM public.product_slide_decks WHERE id=p_deck AND class_id=p_class FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Slide deck outside class'; END IF;
 SELECT count(*) INTO affected FROM public.product_lesson_slides WHERE class_id=p_class AND deck_id=p_deck;
 IF p_replacement IS NOT NULL THEN
  IF p_replacement=p_deck OR NOT EXISTS(SELECT 1 FROM public.product_slide_decks WHERE id=p_replacement AND class_id=p_class AND published_version_id IS NOT NULL) THEN RAISE EXCEPTION 'Choose another published deck of this class'; END IF;
  UPDATE public.product_lesson_slides SET deck_id=p_replacement,start_page=NULL,end_page=NULL,revision=revision+1,updated_by=public.current_user_id(),updated_at=now() WHERE class_id=p_class AND deck_id=p_deck;
  IF target.is_default THEN
   UPDATE public.product_slide_decks SET is_default=false WHERE id=p_deck;
   UPDATE public.product_lesson_slides SET start_page=NULL,end_page=NULL,revision=revision+1,updated_by=public.current_user_id(),updated_at=now() WHERE class_id=p_class AND mode='inherit' AND start_page IS NOT NULL;
   UPDATE public.product_slide_decks SET is_default=true,updated_at=now() WHERE id=p_replacement;
  END IF;
 ELSIF (affected>0 OR target.is_default) AND p_confirm_off IS NOT TRUE THEN RAISE EXCEPTION 'Choose a replacement deck or confirm turning slides off';
 ELSE
  UPDATE public.product_lesson_slides SET mode='off',deck_id=NULL,start_page=NULL,end_page=NULL,revision=revision+1,updated_by=public.current_user_id(),updated_at=now() WHERE class_id=p_class AND deck_id=p_deck;
  IF target.is_default THEN
   UPDATE public.product_lesson_slides SET mode='off',start_page=NULL,end_page=NULL,revision=revision+1,updated_by=public.current_user_id(),updated_at=now() WHERE class_id=p_class AND mode='inherit';
  END IF;
 END IF;
 DELETE FROM public.product_slide_decks WHERE id=p_deck;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'slides.remove','Deck '||p_deck||coalesce(' replaced by '||p_replacement,' turned off')||'; lessons '||affected);
 RETURN jsonb_build_object('removed',p_deck,'lessons',affected);
END $$;

DO $$ DECLARE f text; BEGIN
 FOREACH f IN ARRAY ARRAY['product_slides_begin(uuid)','product_slides_effective_pages(uuid,text,uuid)','product_slides_assert_ranges(uuid,uuid,boolean,integer)','product_lesson_slides_scope()',
  'product_slide_add_version(uuid,uuid,uuid,text,text,text,text,text,integer,text,integer)','product_slide_publish(uuid,uuid,uuid,jsonb,text)',
  'product_slide_set_default(uuid,uuid)','product_slide_save_lesson(uuid,uuid,integer,text,uuid,integer,integer)','product_slide_remove_deck(uuid,uuid,uuid,boolean)'] LOOP
  EXECUTE 'REVOKE ALL PRIVILEGES ON FUNCTION public.'||f||' FROM PUBLIC, anon';
 END LOOP;
 FOREACH f IN ARRAY ARRAY['product_slide_add_version(uuid,uuid,uuid,text,text,text,text,text,integer,text,integer)','product_slide_publish(uuid,uuid,uuid,jsonb,text)',
  'product_slide_set_default(uuid,uuid)','product_slide_save_lesson(uuid,uuid,integer,text,uuid,integer,integer)','product_slide_remove_deck(uuid,uuid,uuid,boolean)'] LOOP
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.'||f||' TO authenticated';
 END LOOP;
END $$;
COMMIT;
