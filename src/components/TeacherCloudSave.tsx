import {useEffect,useRef,useState} from 'react';
import {Link} from '@tanstack/react-router';
import {useTeacherAccount} from '@/hooks/use-teacher-account';
import {saveTeacherLesson} from '@/lib/teacher-workspace.functions';
import {preparedLectureSnapshot,type WorkspaceSnapshot,type WorkspaceScope} from '@/lib/teacher-workspace';
import type {GenerationResult} from '@/lib/generate.functions';
import {Button} from './ui/button';
export function TeacherCloudSave({getSnapshot,initialId,preparedLesson,preparedScope,preparedOwnerEmail=''}:{getSnapshot:()=>Promise<WorkspaceSnapshot>;initialId?:string;preparedLesson?:GenerationResult;preparedScope?:WorkspaceScope;preparedOwnerEmail?:string}){
  const {account,checking,error,refresh}=useTeacherAccount();
  const [id,setId]=useState(initialId),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  const revision=useRef(0);
  const automatic=useRef<{lesson:GenerationResult;owner:string;id:string;promise:ReturnType<typeof saveTeacherLesson>}|null>(null);
  useEffect(()=>{revision.current++;setStatus('');setBusy(false);setId(initialId);return()=>{revision.current++;};},[account,initialId]);
  useEffect(()=>{
    if(initialId||checking||!account?.signedIn||!preparedLesson||!preparedScope||!preparedOwnerEmail||account.email.toLowerCase()!==preparedOwnerEmail.toLowerCase())return;
    let active=true;const run=++revision.current;
    if(automatic.current?.lesson!==preparedLesson||automatic.current.owner!==preparedOwnerEmail){
      const lectureId=crypto.randomUUID();
      const promise=(async()=>saveTeacherLesson({data:{id:lectureId,expectedEmail:preparedOwnerEmail,snapshot:preparedLectureSnapshot(preparedLesson,preparedScope)}}))();
      automatic.current={lesson:preparedLesson,owner:preparedOwnerEmail,id:lectureId,promise};
    }
    const pending=automatic.current;
    setId(pending.id);setBusy(true);setStatus('Saving prepared lecture to your history…');
    void pending.promise.then(saved=>{if(active&&run===revision.current){setId(saved.id);setStatus('Prepared lecture saved to your history.');}}).catch(()=>{if(active&&run===revision.current)setStatus('Lecture history saving failed. Your notes are still open. Use Save to my workspace to retry.');}).finally(()=>{if(active&&run===revision.current)setBusy(false);});
    return()=>{active=false;};
  },[preparedLesson,preparedOwnerEmail,account?.email,account?.signedIn,checking,initialId]);
  async function save(){const run=++revision.current;setBusy(true);setStatus('Saving private cloud backup…');try{const snapshot=await getSnapshot();const saved=await saveTeacherLesson({data:{id,snapshot,expectedEmail:account?.email}});if(run===revision.current){setId(saved.id);setStatus('Cloud backup confirmed. Saved to My teaching workspace.');}}catch(e){if(run===revision.current)setStatus(e instanceof Error?e.message:'Cloud saving failed. Your local notes are unchanged.');}finally{if(run===revision.current)setBusy(false);}}
  return <section className="my-3 flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3 text-sm print:hidden" aria-label="Private teacher cloud backup">
    <Link to="/workspace" target="_blank" rel="noopener noreferrer" className="font-medium underline">My teaching workspace</Link>
    {checking?<span role="status">Checking teacher sign-in…</span>:account?.signedIn?<><span>{account.email}</span><Button size="sm" variant="outline" disabled={busy} onClick={save}>{busy?'Saving…':'Save to my workspace'}</Button><span className="text-muted-foreground">Signed-in preparation is added to history automatically. Click Save to include later personal edits, images and bookmarks.</span></>:<a className="underline" href="/workspace" target="_blank" rel="noopener noreferrer">Sign in to save a cloud backup · opens a new tab</a>}
    {error&&<><span role="alert">{error}</span><Button size="sm" variant="outline" onClick={refresh}>Retry sign-in check</Button></>}
    {status&&<span role="status">{status}</span>}
  </section>;
}
