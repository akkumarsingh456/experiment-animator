BEGIN;
-- Preserve every existing source row and public reading. Block mutations even
-- through a service-backed endpoint or a previously issued upload ticket.
CREATE OR REPLACE FUNCTION public.reject_source_library_changes()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
 RAISE EXCEPTION 'Source library is read-only: uploads, changes and deletion are disabled.' USING ERRCODE = '42501';
END;
$$;
DO $$
DECLARE target text;
BEGIN
 FOREACH target IN ARRAY ARRAY['ncert_books','ncert_pages','ncert_chunks'] LOOP
  EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM PUBLIC, anon, authenticated, service_role',target);
  EXECUTE format('DROP TRIGGER IF EXISTS source_library_frozen ON public.%I',target);
  EXECUTE format('CREATE TRIGGER source_library_frozen BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.reject_source_library_changes()',target);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.reject_source_book_storage_changes()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
 IF TG_OP <> 'INSERT' THEN
  IF OLD.bucket_id = 'ncert-pdfs' THEN
   RAISE EXCEPTION 'Source book storage is read-only.' USING ERRCODE = '42501';
  END IF;
 END IF;
 IF TG_OP <> 'DELETE' THEN
  IF NEW.bucket_id = 'ncert-pdfs' THEN
   RAISE EXCEPTION 'Source book storage is read-only.' USING ERRCODE = '42501';
  END IF;
 END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS source_book_storage_frozen ON storage.objects;
CREATE TRIGGER source_book_storage_frozen BEFORE INSERT OR UPDATE OR DELETE
 ON storage.objects FOR EACH ROW EXECUTE FUNCTION public.reject_source_book_storage_changes();
NOTIFY pgrst, 'reload schema';
COMMIT;
