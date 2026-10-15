import {useEffect,useState,type ReactNode,type FormEvent} from "react";
import {Link} from "@tanstack/react-router";
import {supabase} from "@/integrations/supabase/client";
import {getLibraryAccess} from "@/lib/library-access.functions";
import {BookOpen,Mail,LogOut,ShieldCheck} from "lucide-react";
type Access={signedIn:boolean;admin:boolean;email:string;name:string};
export function LibraryAccessGate({children}:{children:ReactNode}){
 const [access,setAccess]=useState<Access|null>(null),[checking,setChecking]=useState(true),[error,setError]=useState("");
 const [email,setEmail]=useState(""),[name,setName]=useState("");
 const [message,setMessage]=useState("I have just seen your website and would like to suggest some changes. Please also consider the following books or resources:\n\nBook title / author / class / subject:\nWhy this would be useful:\nOther suggestions:\n");
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 useEffect(()=>{let active=true;let revision=0;
  const refresh=async()=>{const run=++revision;setChecking(true);try{await supabase.auth.getSession();const value=await getLibraryAccess();if(active&&run===revision){setAccess(value);setEmail(value.email);setName(value.name);setError("");}}catch{if(active&&run===revision){setAccess(null);setError("Sign-in status could not be verified. Please try again.");}}finally{if(active&&run===revision)setChecking(false);}};
  void refresh();const {data}=supabase.auth.onAuthStateChange(()=>{setChecking(true);setTimeout(()=>void refresh(),0);});return()=>{active=false;data.subscription.unsubscribe();};
 },[]);
 const google=async()=>{setBusy(true);setError("");try{const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${window.location.origin}/upload`,queryParams:{prompt:"select_account"}}});if(error)throw error;}catch{setError("Google sign-in is unavailable. Please ask the administrator to enable Google authentication and the website redirect URL.");}finally{setBusy(false);}};
 const magic=async(event:FormEvent)=>{event.preventDefault();setBusy(true);setError("");try{const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:`${window.location.origin}/upload`}});if(error)throw error;setNotice("Check your email for your sign-in link. If it does not arrive, try Google sign-in or contact the administrator.");}catch{setError("The sign-in email could not be sent. Please retry later or use Google sign-in.");}finally{setBusy(false);}};
 const logout=async()=>{setChecking(true);await supabase.auth.signOut();setAccess(null);setChecking(false);};
 if(checking)return <main className="library-access-panel"><p role="status">Checking your verified sign-in…</p></main>;
 if(access?.admin)return <><div className="library-admin-bar"><ShieldCheck size={18}/><span>Administrator · {access.email}</span><button onClick={logout}><LogOut size={16}/>Sign out</button></div>{children}</>;
 const body=`Hi Aman,\n\nMy name is ${name || "[your name]"} and my email is ${email || "[your email]"}.\n\n${message}\n\nThank you,\n${name || "[your name]"}`;
 return <main className="library-access-panel"><Link to="/" className="edu-brand"><BookOpen/>EduPlan</Link><h1>{access?.signedIn?"Suggest a book or an improvement":"Sign in to library access"}</h1><p>Only approved administrators can upload PDFs or manage the source library. Lessons use the approved NCERT collection.</p>
 {error&&<p role="alert" className="library-access-error">{error}</p>}
 {!access?.signedIn?<><button className="edu-button" disabled={busy} onClick={google}>Continue with Google</button><div className="library-access-divider">or use an email sign-in link</div><form onSubmit={magic}><label>Email address<input type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label><button className="edu-button" disabled={busy}>Send sign-in link</button></form>{notice&&<p role="status">{notice}</p>}</>:<><p className="library-verified-email"><ShieldCheck size={17}/>Signed in as {access.email}</p><label>Your name<input value={name} onChange={event=>setName(event.target.value)} autoComplete="name"/></label><label>Your contact email<input type="email" value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Books and suggestions<textarea rows={8} value={message} onChange={event=>setMessage(event.target.value)}/></label><a className="edu-button" href={`mailto:akkumarsingh456@gmail.com?subject=${encodeURIComponent("EduPlan — book recommendation and suggestions")}&body=${encodeURIComponent(body)}`}><Mail size={18}/>Open draft in my email app</a><p className="text-sm">The draft opens in your configured email app. Edit it there before sending. This website does not send it automatically.</p><button className="edu-text-link" onClick={logout}>Sign out</button></>}
 </main>;
}
