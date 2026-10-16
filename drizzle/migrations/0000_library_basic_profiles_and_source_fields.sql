ALTER TABLE public.ncert_books ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'unreviewed';
ALTER TABLE public.ncert_books ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.ncert_books ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL DEFAULT '',
 avatar_url text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_read_own ON public.profiles FOR SELECT TO authenticated USING ((select auth.uid()) = id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

CREATE FUNCTION public.create_library_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.profiles (id, display_name, avatar_url)
 VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''))
 ON CONFLICT (id) DO NOTHING;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_library_profile() FROM PUBLIC;
CREATE TRIGGER create_library_profile_after_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_library_profile();
INSERT INTO public.profiles (id, display_name, avatar_url)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''), COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture', '') FROM auth.users ON CONFLICT (id) DO NOTHING;