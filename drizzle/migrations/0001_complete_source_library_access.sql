-- Complete the source-library update after the basic profile migration. No textbook rows are deleted.
ALTER TABLE public.ncert_books ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'unreviewed';
ALTER TABLE public.ncert_books ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.ncert_books ADD COLUMN IF NOT EXISTS approved_at timestamptz;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ncert_source_kind_check' AND conrelid='public.ncert_books'::regclass) THEN
  ALTER TABLE public.ncert_books ADD CONSTRAINT ncert_source_kind_check CHECK (source_kind IN ('unreviewed','ncert','reference'));
 END IF;
END $$;
-- Historical filenames are not proof of provenance: existing books require an administrator review.
UPDATE public.ncert_books SET download_url = NULL WHERE download_url IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_source_library_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (
   SELECT 1 FROM auth.users u WHERE u.id = auth.uid()
   AND u.email_confirmed_at IS NOT NULL
   AND lower(u.email) IN ('akkumarsingh456@gmail.com','ak25edi00022@student.nitw.ac.in')
 );
$$;
REVOKE ALL ON FUNCTION public.is_source_library_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_source_library_admin() TO authenticated;

DO $$
DECLARE target text; policy_row record;
BEGIN
 FOREACH target IN ARRAY ARRAY['ncert_books','ncert_pages','ncert_chunks'] LOOP
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',target);
   FOR policy_row IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=target LOOP
     EXECUTE format('DROP POLICY %I ON public.%I',policy_row.policyname,target);
   END LOOP;
   EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',target);
   EXECUTE format('GRANT SELECT ON public.%I TO authenticated',target);
   EXECUTE format('GRANT ALL ON public.%I TO service_role',target);
   EXECUTE format('CREATE POLICY source_library_admin_read ON public.%I FOR SELECT TO authenticated USING (public.is_source_library_admin())',target);
   EXECUTE format('CREATE POLICY source_library_server_only ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',target);
 END LOOP;
END $$;
-- A restrictive bucket policy also overrides any unrelated permissive storage policy.
UPDATE storage.buckets SET public=false WHERE id='ncert-pdfs';
DROP POLICY IF EXISTS source_library_no_direct_access ON storage.objects;
CREATE POLICY source_library_no_direct_access ON storage.objects AS RESTRICTIVE
 FOR ALL TO anon, authenticated
 USING (bucket_id <> 'ncert-pdfs') WITH CHECK (bucket_id <> 'ncert-pdfs');
-- Clients cannot poison shared generated notes or control the shared build queue.
REVOKE INSERT, UPDATE, DELETE ON public.lesson_cache, public.slide_image_cache, public.lesson_build_jobs, public.lesson_build_state FROM anon, authenticated;
GRANT ALL ON public.lesson_cache, public.slide_image_cache, public.lesson_build_jobs, public.lesson_build_state TO service_role;
-- Refresh PostgREST after the transaction commits so the new columns are visible.
NOTIFY pgrst, 'reload schema';
