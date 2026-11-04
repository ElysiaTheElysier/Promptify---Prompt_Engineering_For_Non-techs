-- Rollback for 024. Deploy an API without the slide actions first. Drops slide metadata only; private PDF objects in the
-- slides bucket stay (immutable) and can be removed separately once nobody needs them.
BEGIN;
DROP FUNCTION public.product_slide_remove_deck(uuid,uuid,uuid,boolean);
DROP FUNCTION public.product_slide_save_lesson(uuid,uuid,integer,text,uuid,integer,integer);
DROP FUNCTION public.product_slide_set_default(uuid,uuid);
DROP FUNCTION public.product_slide_publish(uuid,uuid,uuid,jsonb,text);
DROP FUNCTION public.product_slide_add_version(uuid,uuid,uuid,text,text,text,text,text,integer,text,integer);
DROP FUNCTION public.product_slides_assert_ranges(uuid,uuid,boolean,integer);
DROP FUNCTION public.product_slides_effective_pages(uuid,text,uuid);
DROP FUNCTION public.product_slides_begin(uuid);
DROP TABLE public.product_lesson_slides;
DROP FUNCTION public.product_lesson_slides_scope();
ALTER TABLE public.product_slide_decks DROP CONSTRAINT product_slide_decks_published_fk;
DROP TABLE public.product_slide_versions;
DROP TABLE public.product_slide_decks;
COMMIT;
