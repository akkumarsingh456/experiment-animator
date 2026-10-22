import {useEffect,useState,type FormEvent} from 'react';
import {Link} from '@tanstack/react-router';
import {useTeacherAccount} from '@/hooks/use-teacher-account';
import {lovable} from '@/integrations/lovable';
import {supabase} from '@/integrations/supabase/client';
import {googleLibraryOptions} from '@/lib/library-login';
import {TeacherLecturePlanner} from './TeacherLecturePlanner';
import {Button} from './ui/button';

export function TeacherWorkspace(){
  const {account,checking,error:accountError,refresh}=useTeacherAccount();
  const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
  const [reload,setReload]=useState(0);
  useEffect(()=>{setBusy(false);},[account]);
  async function google(){setBusy(true);setError('');try{sessionStorage.setItem('library-login-return','/workspace');const result=await lovable.auth.signInWithOAuth('google',googleLibraryOptions(window.location.origin));if(result.error)throw result.error;if(result.redirected)return;sessionStorage.removeItem('library-login-return');await refresh();}catch{setError('Google sign-in could not be completed. Please retry or use the email link.');}finally{setBusy(false);}}
  async function magic(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:`${window.location.origin}/workspace`}});if(error)throw error;setNotice('Check your email for your sign-in link.');}catch{setError('The sign-in email could not be sent. Please try Google sign-in or retry later.');}finally{setBusy(false);}}
  async function logout(){setBusy(true);const {error}=await supabase.auth.signOut();setBusy(false);if(error)setError('Sign-out failed. Please retry.');else{setNotice('Signed out.');await refresh();}}
  return <main className="mx-auto max-w-6xl p-5 sm:p-8"><header className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link to="/" className="font-semibold">← EduPlan home</Link><Link to="/history">Uploaded books</Link></header><h1 className="text-3xl font-bold">My teaching workspace</h1><p className="my-3 text-muted-foreground">Sign in to keep private cloud backups of your prepared lessons, added slides, imported images and teaching bookmarks. Reading books and generating lessons remain available without signing in.</p>
    {(error||accountError)&&<p role="alert" className="my-3 text-destructive">{error||accountError}</p>}{notice&&<p role="status">{notice}</p>}
    {checking?<p role="status">Checking your account…</p>:account?.signedIn?<><div className="my-5 flex flex-wrap items-center gap-3"><span className="text-sm">Signed in as {account.email}</span><Button variant="outline" disabled={busy} onClick={logout}>Sign out</Button><Button variant="outline" disabled={busy} onClick={()=>setReload(value=>value+1)}>Refresh saved lessons</Button><Button asChild><Link to="/">Prepare a lecture</Link></Button></div><TeacherLecturePlanner key={account.email} ownerEmail={account.email} refreshKey={reload}/><details className="mt-6 text-sm text-slate-600"><summary className="cursor-pointer">About saved lectures</summary><p className="mt-2">New lectures prepared while signed in are saved here when cloud saving succeeds. Use Save to my workspace inside a lecture to include later personal edits, images and bookmarks. Past anonymous or previously unsaved lectures cannot be assigned to your account. Teaching plans are private and do not change your lesson notes.</p></details></>:<section className="my-6 max-w-lg rounded-xl border bg-white p-6"><h2 className="text-xl font-semibold">Teacher sign-in</h2><p className="my-3 text-sm">Use your existing Google account or an email sign-in link. This does not grant administrator or source-upload permissions.</p><Button className="w-full" variant="outline" disabled={busy} onClick={google}>Continue with Google</Button><form className="mt-5 grid gap-3" onSubmit={magic}><label>Email address<input className="mt-1 w-full rounded border p-3" type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label><Button type="submit" disabled={busy}>Send sign-in link</Button></form>{accountError&&<Button className="mt-3" variant="outline" onClick={refresh}>Retry account check</Button>}</section>}
  </main>;
}
