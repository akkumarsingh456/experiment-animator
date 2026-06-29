
CREATE TABLE public.lesson_cache (
  cache_key text PRIMARY KEY,
  klass text NOT NULL,
  subject text NOT NULL,
  chapter text NOT NULL DEFAULT '',
  topic text NOT NULL,
  subtopics text NOT NULL DEFAULT '',
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.lesson_cache TO anon, authenticated;
GRANT ALL ON public.lesson_cache TO service_role;
ALTER TABLE public.lesson_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_cache readable by anyone" ON public.lesson_cache FOR SELECT USING (true);
CREATE POLICY "lesson_cache insertable by anyone" ON public.lesson_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "lesson_cache updatable by anyone" ON public.lesson_cache FOR UPDATE USING (true) WITH CHECK (true);
CREATE INDEX lesson_cache_lookup ON public.lesson_cache (klass, subject, topic);

CREATE TABLE public.slide_image_cache (
  cache_key text PRIMARY KEY,
  klass text NOT NULL,
  subject text NOT NULL,
  title text NOT NULL,
  visual_prompt text NOT NULL DEFAULT '',
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.slide_image_cache TO anon, authenticated;
GRANT ALL ON public.slide_image_cache TO service_role;
ALTER TABLE public.slide_image_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slide_image_cache readable by anyone" ON public.slide_image_cache FOR SELECT USING (true);
CREATE POLICY "slide_image_cache insertable by anyone" ON public.slide_image_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "slide_image_cache updatable by anyone" ON public.slide_image_cache FOR UPDATE USING (true) WITH CHECK (true);
CREATE INDEX slide_image_cache_lookup ON public.slide_image_cache (klass, subject, title);
