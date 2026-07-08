
-- Permanence: block deletes on pages/chunks the same way as ncert_books
DROP TRIGGER IF EXISTS ncert_pages_no_delete ON public.ncert_pages;
CREATE TRIGGER ncert_pages_no_delete BEFORE DELETE ON public.ncert_pages
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ncert_delete();

DROP TRIGGER IF EXISTS ncert_chunks_no_delete ON public.ncert_chunks;
CREATE TRIGGER ncert_chunks_no_delete BEFORE DELETE ON public.ncert_chunks
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ncert_delete();

-- Retrieval indexes for fast lookup during note generation
CREATE INDEX IF NOT EXISTS ncert_books_class_subject_chapter_idx
  ON public.ncert_books (class, subject, chapter);
CREATE INDEX IF NOT EXISTS ncert_books_chapter_lower_idx
  ON public.ncert_books (lower(chapter));
CREATE INDEX IF NOT EXISTS ncert_chunks_book_chunk_idx
  ON public.ncert_chunks (book_id, chunk_index);
CREATE INDEX IF NOT EXISTS ncert_pages_book_page_idx
  ON public.ncert_pages (book_id, page_number);
