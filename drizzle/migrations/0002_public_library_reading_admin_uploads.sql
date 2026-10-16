-- Reading and lesson generation are public; only source uploads/changes require admin access.
-- Do not approve, relabel, delete or replace any existing books or notes.
DO $$
DECLARE target text; policy_row record;
BEGIN
 FOREACH target IN ARRAY ARRAY['ncert_books','ncert_pages','ncert_chunks'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',target);
  FOR policy_row IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=target LOOP
   EXECUTE format('DROP POLICY %I ON public.%I',policy_row.policyname,target);
  END LOOP;
  EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',target);
  EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated',target);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',target);
  EXECUTE format('CREATE POLICY source_library_public_read ON public.%I FOR SELECT TO anon, authenticated USING (true)',target);
  EXECUTE format('CREATE POLICY source_library_server_write ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',target);
 END LOOP;
END $$;
-- PDFs remain in private storage; the public book reader signs only recorded books.
-- Upload tickets, book/page/chunk insertion and source edits remain admin-only server actions.
NOTIFY pgrst, 'reload schema';
