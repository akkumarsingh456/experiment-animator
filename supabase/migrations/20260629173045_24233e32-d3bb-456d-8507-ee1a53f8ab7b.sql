
CREATE TABLE public.slide_image_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  cache_key text NOT NULL,
  klass text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  visual_prompt text NOT NULL DEFAULT '',
  grounding text NOT NULL DEFAULT '',
  bullets text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  nocache boolean NOT NULL DEFAULT false,
  cached boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  error text,
  image_url text,
  duration_ms integer
);
GRANT SELECT, INSERT ON public.slide_image_audit TO anon, authenticated;
GRANT ALL ON public.slide_image_audit TO service_role;
ALTER TABLE public.slide_image_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit readable by anyone" ON public.slide_image_audit FOR SELECT USING (true);
CREATE POLICY "audit insertable by anyone" ON public.slide_image_audit FOR INSERT WITH CHECK (true);
CREATE INDEX slide_image_audit_created_idx ON public.slide_image_audit (created_at DESC);
CREATE INDEX slide_image_audit_cache_key_idx ON public.slide_image_audit (cache_key);
