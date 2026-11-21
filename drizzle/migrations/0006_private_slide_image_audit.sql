-- Image-generation diagnostics can contain teacher prompts and error details.
-- Keep diagnostics private and prevent anonymous clients from flooding the audit log.
BEGIN;
ALTER TABLE public.slide_image_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.slide_image_audit FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.slide_image_audit TO service_role;
DROP POLICY IF EXISTS "audit readable by anyone" ON public.slide_image_audit;
DROP POLICY IF EXISTS "audit insertable by anyone" ON public.slide_image_audit;
DROP POLICY IF EXISTS slide_image_audit_service_only ON public.slide_image_audit;
CREATE POLICY slide_image_audit_service_only
  ON public.slide_image_audit
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
NOTIFY pgrst, 'reload schema';
COMMIT;
