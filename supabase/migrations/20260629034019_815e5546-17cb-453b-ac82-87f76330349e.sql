
-- Drop existing delete permission and any old delete policies
REVOKE DELETE ON public.ncert_books FROM anon, authenticated, public;
REVOKE DELETE ON public.ncert_pages FROM anon, authenticated, public;
REVOKE DELETE ON public.ncert_chunks FROM anon, authenticated, public;

DROP POLICY IF EXISTS "ncert_books deletable by anyone" ON public.ncert_books;
DROP POLICY IF EXISTS "ncert_pages deletable by anyone" ON public.ncert_pages;
DROP POLICY IF EXISTS "ncert_chunks deletable by anyone" ON public.ncert_chunks;

-- Hard block: even if delete is ever re-granted, this policy denies it
CREATE POLICY "ncert_books no delete" ON public.ncert_books FOR DELETE USING (false);
CREATE POLICY "ncert_pages no delete" ON public.ncert_pages FOR DELETE USING (false);
CREATE POLICY "ncert_chunks no delete" ON public.ncert_chunks FOR DELETE USING (false);

-- Trigger-level guard as final safety net (blocks even service role via Data API)
CREATE OR REPLACE FUNCTION public.prevent_ncert_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'NCERT library is permanent. Deletion is not allowed.';
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS ncert_books_no_delete ON public.ncert_books;
DROP TRIGGER IF EXISTS ncert_pages_no_delete ON public.ncert_pages;
DROP TRIGGER IF EXISTS ncert_chunks_no_delete ON public.ncert_chunks;

CREATE TRIGGER ncert_books_no_delete BEFORE DELETE ON public.ncert_books
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ncert_delete();
CREATE TRIGGER ncert_pages_no_delete BEFORE DELETE ON public.ncert_pages
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ncert_delete();
CREATE TRIGGER ncert_chunks_no_delete BEFORE DELETE ON public.ncert_chunks
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ncert_delete();

-- Helpful indexes for faster Generate Lesson lookups
CREATE INDEX IF NOT EXISTS ncert_books_class_subject_idx ON public.ncert_books (class, subject);
CREATE INDEX IF NOT EXISTS ncert_chunks_book_id_idx ON public.ncert_chunks (book_id);
