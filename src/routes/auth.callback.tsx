import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { libraryReturnPath } from '@/lib/library-login';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/auth/callback')({
  head: () => ({ meta: [
    { title: 'Finish Library Sign-in — EduPlan AI' },
    { name: 'description', content: 'Complete your Google sign-in and return to the EduPlan book library.' },
    { property: 'og:title', content: 'Finish Library Sign-in — EduPlan AI' },
    { property: 'og:description', content: 'Securely return to your EduPlan library after selecting your Google account.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: LibraryAuthCallback,
});

function LibraryAuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !data.user) { setError(true); return; }
      const to = libraryReturnPath(sessionStorage.getItem('library-login-return'));
      sessionStorage.removeItem('library-login-return');
      await navigate({ to, replace: true });
    })().catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [navigate]);
  return <main className="library-access-panel">
    <h1>{error ? 'Sign-in was not completed' : 'Finishing sign-in…'}</h1>
    {error ? <><p role="alert">Please return to the library and try selecting your Google account again.</p><Button onClick={() => navigate({ to: '/upload', replace: true })}>Return to library</Button></> : <p role="status">Checking your account…</p>}
  </main>;
}