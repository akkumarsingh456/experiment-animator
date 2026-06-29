
-- ncert_books: drop permissive insert/update, allow only service_role
DROP POLICY IF EXISTS "ncert_books insertable by anyone" ON public.ncert_books;
DROP POLICY IF EXISTS "ncert_books updatable by anyone" ON public.ncert_books;
REVOKE INSERT, UPDATE ON public.ncert_books FROM anon, authenticated;
CREATE POLICY "ncert_books service insert"
  ON public.ncert_books FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "ncert_books service update"
  ON public.ncert_books FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- ncert_pages
DROP POLICY IF EXISTS "ncert_pages insertable by anyone" ON public.ncert_pages;
REVOKE INSERT ON public.ncert_pages FROM anon, authenticated;
CREATE POLICY "ncert_pages service insert"
  ON public.ncert_pages FOR INSERT TO service_role WITH CHECK (true);

-- ncert_chunks
DROP POLICY IF EXISTS "ncert_chunks insertable by anyone" ON public.ncert_chunks;
REVOKE INSERT ON public.ncert_chunks FROM anon, authenticated;
CREATE POLICY "ncert_chunks service insert"
  ON public.ncert_chunks FOR INSERT TO service_role WITH CHECK (true);

-- Storage bucket: ncert-pdfs — drop any public write/delete policies, allow service_role only
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (qual ILIKE '%ncert-pdfs%' OR with_check ILIKE '%ncert-pdfs%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "ncert-pdfs service write"
  ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'ncert-pdfs');
CREATE POLICY "ncert-pdfs service update"
  ON storage.objects FOR UPDATE TO service_role
  USING (bucket_id = 'ncert-pdfs') WITH CHECK (bucket_id = 'ncert-pdfs');
CREATE POLICY "ncert-pdfs service delete"
  ON storage.objects FOR DELETE TO service_role
  USING (bucket_id = 'ncert-pdfs');
