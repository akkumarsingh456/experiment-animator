-- Private website requests; no email integration or changes to source books.
CREATE TABLE public.book_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 requester_name text NOT NULL CHECK (char_length(requester_name) BETWEEN 1 AND 120),
 verified_email text NOT NULL,
 message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 5000),
 status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX book_requests_created_idx ON public.book_requests(created_at DESC, id);
CREATE INDEX book_requests_user_created_idx ON public.book_requests(user_id,created_at DESC);
ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.book_requests FROM anon, authenticated;
GRANT ALL ON public.book_requests TO service_role;
CREATE POLICY book_requests_server_only ON public.book_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
NOTIFY pgrst, 'reload schema';
