import {useEffect,useRef,useState} from 'react';
import {Link} from '@tanstack/react-router';
import {useTeacherAccount} from '@/hooks/use-teacher-account';
import {saveTeacherLesson} from '@/lib/teacher-workspace.functions';
import type {WorkspaceSnapshot} from '@/lib/teacher-workspace';
import {Button} from './ui/button';
export function TeacherCloudSave({getSnapshot,initialId}:{getSnapshot:()=>Promise<WorkspaceSnapshot>;initialId?:string}){
  const {account,checking,error,refresh}=useTeacherAccount();
  const [id,setId]=useState(initialId),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  const revision=useRef(0);
  useEffect(()=>{revision.current++;setStatus('');setBusy(false);setId(initialId);return()=>{revision.current++;};},[account,initialId]);
  async function save(){const run=++revision.current;setBusy(true);setStatus('Saving private cloud backup…');try{const snapshot=await getSnapshot();const saved=await saveTeacherLesson({data:{id,snapshot}});if(run===revision.current){setId(saved.id);setStatus('Cloud backup confirmed. Saved to My teaching workspace.');}}catch(e){if(run===revision.current)setStatus(e instanceof Error?e.message:'Cloud saving failed. Your local notes are unchanged.');}finally{if(run===revision.current)setBusy(false);}}
  return <section className="my-3 flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3 text-sm print:hidden" aria-label="Private teacher cloud backup">
    <Link to="/workspace" target="_blank" rel="noopener noreferrer" className="font-medium underline">My teaching workspace</Link>
    {checking?<span role="status">Checking teacher sign-in…</span>:account?.signedIn?<><span>{account.email}</span><Button size="sm" variant="outline" disabled={busy} onClick={save}>{busy?'Saving…':'Save to my workspace'}</Button><span className="text-muted-foreground">Cloud backup is saved when you click; local autosaving is unchanged.</span></>:<a className="underline" href="/workspace" target="_blank" rel="noopener noreferrer">Sign in to save a cloud backup · opens a new tab</a>}
    {error&&<><span role="alert">{error}</span><Button size="sm" variant="outline" onClick={refresh}>Retry sign-in check</Button></>}
    {status&&<span role="status">{status}</span>}
  </section>;
}
