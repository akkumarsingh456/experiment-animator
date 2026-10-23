import {useEffect,useRef,useState} from 'react';
import {pyqDraftKey,pyqKey,type PyqScope} from '@/lib/cbse-pyq';
import {readPyqNote,savePyqNote} from '@/lib/cbse-pyq.functions';
import {Button} from './ui/button';

type Addition={key:string;text:string;id:number};
export function PyqNotebook({scope,email,addition,onConsumed,displayTopic,displayChapter}:{scope:PyqScope;email:string;addition:Addition|null;onConsumed:()=>void;displayTopic?:string;displayChapter?:string}){
 const key=pyqDraftKey(email||'anonymous',scope);
 const [draft]=useState(()=>{try{const raw=localStorage.getItem(key);if(!raw)return null;const value=JSON.parse(raw);return typeof value.text==='string'&&value.text.length<=12000?value as {text:string;baseRevision:string}:null;}catch{return null;}});
 const [text,setText]=useState(draft?.text||''),[revision,setRevision]=useState(''),[loading,setLoading]=useState(!!email),[saving,setSaving]=useState(false),[ready,setReady]=useState(!email),[status,setStatus]=useState(draft?'Device draft restored.':'');
 const lastAddition=useRef<number|null>(null),latest=useRef(text);latest.current=text;
 useEffect(()=>{let active=true;if(!email)return;setLoading(true);void Promise.resolve().then(()=>readPyqNote({data:scope})).then(record=>{
   if(!active)return;setRevision(record?.revision||'');setReady(true);
   if(!draft){setText(record?.text||'');latest.current=record?.text||'';setStatus(record?'Private cloud notes loaded.':'No cloud notes saved for this topic and year yet.');}
   else setStatus(draft.baseRevision!==(record?.revision||'')?'Cloud notes changed. Your device draft is kept; review it before saving.':'Device draft restored. Save to keep it in your private workspace.');
 }).catch(error=>{if(active){setReady(false);setStatus(error instanceof Error?error.message:'Cloud notes could not be loaded. Your device draft is kept.');}}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 function edit(value:string){setText(value);latest.current=value;try{localStorage.setItem(key,JSON.stringify({text:value,baseRevision:revision}));setStatus('Draft saved on this device. Use Save PYQ notes for a private cloud copy.');}catch{setStatus('Device saving failed. Copy your notes before leaving this page.');}}
 useEffect(()=>{if(!addition||addition.key!==pyqKey(scope)||lastAddition.current===addition.id||loading)return;lastAddition.current=addition.id;const next=[latest.current,addition.text].filter(Boolean).join('\n\n');if(next.length>12000)setStatus('This notebook is full. Shorten your notes before adding another reference.');else edit(next);onConsumed();},[addition,loading]);
 async function save(){setSaving(true);const sent=latest.current;try{
   const saved=await savePyqNote({data:{scope,text:sent,expectedRevision:revision,expectedEmail:email}});setRevision(saved.revision);
   if(latest.current===sent){try{localStorage.removeItem(key);}catch{}setStatus('PYQ notes saved privately to your workspace.');}
   else{try{localStorage.setItem(key,JSON.stringify({text:latest.current,baseRevision:saved.revision}));}catch{}setStatus('Previous version saved. Save again to include your newer edits.');}
 }catch(error){setStatus(error instanceof Error?error.message:'Saving failed. Your device draft is kept.');}finally{setSaving(false);}}
 return <div className="mt-4 rounded-xl border bg-white p-4"><h3 className="font-semibold">My PYQ teaching notes</h3><p className="my-2 text-xs text-slate-600">Class {scope.klass} · {scope.subject} · {displayChapter||scope.chapter||'General'} · {displayTopic||scope.topic||'General'} · {scope.year}. Record the paper/set, question number, answer steps and points to explain. These notes never enter lecture slides.</p>
   <textarea aria-label="PYQ teaching notes" rows={7} maxLength={12000} disabled={loading} className="w-full rounded-lg border p-3 text-sm" value={text} onChange={event=>edit(event.target.value)} placeholder="Paper / set / question number:\nKey concept:\nAnswer steps and marking points:\nCommon mistakes:\nMy teaching reminder:"/>
   <div className="mt-2 flex flex-wrap items-center gap-3"><Button size="sm" disabled={!email||!ready||loading||saving} onClick={save}>{saving?'Saving…':'Save PYQ notes'}</Button><span className="text-xs text-slate-600">{email?'Private cloud save + device drafts':'Sign in for cloud saving. Drafts stay on this device.'}</span></div>
   <p role="status" className="mt-2 text-xs text-slate-600">{loading?'Loading your private notes…':status}</p>
 </div>;
}
