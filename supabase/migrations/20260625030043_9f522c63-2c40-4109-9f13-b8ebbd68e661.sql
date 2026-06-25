
CREATE TABLE public.ncert_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class TEXT NOT NULL,
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  download_url TEXT,
  num_pages INTEGER NOT NULL DEFAULT 0,
  num_chunks INTEGER NOT NULL DEFAULT 0,
  full_text TEXT,
  summary TEXT,
  learner_name TEXT,
  learner_goal TEXT,
  status TEXT NOT NULL DEFAULT 'pending_summary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ncert_books TO anon, authenticated;
GRANT ALL ON public.ncert_books TO service_role;
ALTER TABLE public.ncert_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ncert_books readable by anyone" ON public.ncert_books FOR SELECT USING (true);
CREATE POLICY "ncert_books insertable by anyone" ON public.ncert_books FOR INSERT WITH CHECK (true);
CREATE POLICY "ncert_books updatable by anyone" ON public.ncert_books FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "ncert_books deletable by anyone" ON public.ncert_books FOR DELETE USING (true);
CREATE INDEX ncert_books_class_subject_idx ON public.ncert_books (class, subject);

CREATE TABLE public.ncert_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.ncert_books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, page_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ncert_pages TO anon, authenticated;
GRANT ALL ON public.ncert_pages TO service_role;
ALTER TABLE public.ncert_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ncert_pages readable by anyone" ON public.ncert_pages FOR SELECT USING (true);
CREATE POLICY "ncert_pages insertable by anyone" ON public.ncert_pages FOR INSERT WITH CHECK (true);
CREATE INDEX ncert_pages_book_idx ON public.ncert_pages (book_id, page_number);

CREATE TABLE public.ncert_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.ncert_books(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, chunk_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ncert_chunks TO anon, authenticated;
GRANT ALL ON public.ncert_chunks TO service_role;
ALTER TABLE public.ncert_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ncert_chunks readable by anyone" ON public.ncert_chunks FOR SELECT USING (true);
CREATE POLICY "ncert_chunks insertable by anyone" ON public.ncert_chunks FOR INSERT WITH CHECK (true);
CREATE INDEX ncert_chunks_book_idx ON public.ncert_chunks (book_id, chunk_index);
