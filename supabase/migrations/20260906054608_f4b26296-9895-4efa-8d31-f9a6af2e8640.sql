CREATE TABLE public.lesson_build_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  klass text NOT NULL,
  subject text NOT NULL,
  chapter text NOT NULL,
  subtopics text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  error text,
  slides integer NOT NULL DEFAULT 0,
  duration_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (klass, subject, chapter)
);

GRANT SELECT, INSERT, UPDATE ON public.lesson_build_jobs TO anon;
GRANT SELECT, INSERT, UPDATE ON public.lesson_build_jobs TO authenticated;
GRANT ALL ON public.lesson_build_jobs TO service_role;

ALTER TABLE public.lesson_build_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "build jobs readable by anyone" ON public.lesson_build_jobs FOR SELECT USING (true);
CREATE POLICY "build jobs insertable by anyone" ON public.lesson_build_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "build jobs updatable by anyone" ON public.lesson_build_jobs FOR UPDATE USING (true) WITH CHECK (true);

CREATE TABLE public.lesson_build_state (
  id text NOT NULL PRIMARY KEY,
  status text NOT NULL DEFAULT 'idle',
  message text,
  lease_until timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.lesson_build_state TO anon;
GRANT SELECT, INSERT, UPDATE ON public.lesson_build_state TO authenticated;
GRANT ALL ON public.lesson_build_state TO service_role;

ALTER TABLE public.lesson_build_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "build state readable by anyone" ON public.lesson_build_state FOR SELECT USING (true);
CREATE POLICY "build state insertable by anyone" ON public.lesson_build_state FOR INSERT WITH CHECK (true);
CREATE POLICY "build state updatable by anyone" ON public.lesson_build_state FOR UPDATE USING (true) WITH CHECK (true);

INSERT INTO public.lesson_build_state (id, status, message) VALUES ('library', 'idle', NULL) ON CONFLICT (id) DO NOTHING;

CREATE INDEX lesson_build_jobs_status_idx ON public.lesson_build_jobs (status, created_at);