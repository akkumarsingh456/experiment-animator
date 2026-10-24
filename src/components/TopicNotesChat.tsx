import type {SlideNoteFormat} from "@/lib/slide-notes-request";
import {useEffect,useRef,useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {draftMissingTopicPoints} from '@/lib/missing-topic-ai.functions';
import {recoverTopicFromSources} from '@/lib/topic-source-recovery';
import {getSimpleTopicNotes} from '@/lib/topic-notes.functions';
import {Button} from './ui/button';
import {Textarea} from './ui/textarea';
import {MathText} from './MathText';
import {MathematicsProse} from './MathematicsProse';
import {isMathematics} from '@/lib/mathematics-presentation';

type Source={url:string;title:string};
type Props={sourceText?:string;previewKey?:string;preset?:{request:string;format:SlideNoteFormat;label:string};scope:{klass:string;subject:string;chapter:string;topic:string};onExtract:(lines:string[],sources:Source[])=>void|boolean};

/** One preview and one extraction action; advanced AI is optional. */
export function TopicNotesChat({scope,onExtract,preset,sourceText='',previewKey=''}:Props){
 const read=useServerFn(getSimpleTopicNotes),askAI=useServerFn(draftMissingTopicPoints);
 const [text,setText]=useState(''),[sources,setSources]=useState<Source[]>([]),[label,setLabel]=useState('Teacher notes'),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[request,setRequest]=useState(preset?.request||'');
 const epoch=useRef(0),pending=useRef(false),requestEditor=useRef<HTMLTextAreaElement>(null);
 const [manual,setManual]=useState(false);
 const identity=JSON.stringify(scope);
 const cacheKey='eduplan-topic-preview-v1:'+JSON.stringify([identity,previewKey]);
 function remember(value:string,refs:Source[],name:string){try{localStorage.setItem(cacheKey,JSON.stringify({text:value,sources:refs,label:name}));}catch{/* Lesson saving still reports its own device/cloud status. */}}
 function friendly(reason:unknown){const message=reason instanceof Error?reason.message:'';return /Connect Gemini|not configured/i.test(message)?'The website AI service is not configured. The site owner must connect it.':message||'The notes service did not respond.';}
 const localPreview=()=>sourceText?recoverTopicFromSources(scope.topic,[sourceText]).lines.filter(line=>line.length<=1800).slice(0,500):[];
 useEffect(()=>{epoch.current++;pending.current=false;setText('');setSources([]);setLabel('Teacher notes');setBusy(false);setNotice('');setRequest(preset?.request||'');setManual(false);
  try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');if(cached&&typeof cached.text==='string'&&cached.text.length<=200000){setText(cached.text);setSources(Array.isArray(cached.sources)?cached.sources.filter((ref:Source)=>typeof ref?.url==='string'&&/^https?:\/\//.test(ref.url)&&typeof ref.title==='string'):[]);setLabel(typeof cached.label==='string'?cached.label:'Saved preview');}}catch{}
  return()=>{epoch.current++;};},[identity,cacheKey]);
 useEffect(()=>{if(!manual)setRequest(preset?.request||`Explain ${scope.topic} in clear teaching points`);},[preset?.request,manual]);
 const lines=text.split(/\n+/).map(line=>line.trim().replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '')).filter(Boolean);
 const valid=lines.length>0&&lines.length<=500&&lines.every(line=>line.length<=1800);
 async function load(ai=false){
  if(pending.current)return;
  pending.current=true;setBusy(true);setNotice('');const turn=++epoch.current;
  let aiIssue='';
  try{
   let result;
   if(ai){
    try{result=await askAI({data:{...scope,recoveryOnly:true,format:manual?undefined:preset?.format,request:request.trim()||`Explain ${scope.topic} in clear teaching points`,history:[]}});
     if(!result.lines?.length)throw new Error('The AI returned no usable points.');
    }catch(reason){aiIssue=friendly(reason);result=await read({data:scope});}
   }else result=await read({data:scope});
   if(turn!==epoch.current)return;
   if(!result.lines?.length||result.lines.length>500||result.lines.some(line=>!line.trim()||line.length>1800))throw new Error('The service did not return usable points.');
   const name='label' in result?result.label:`${result.provider} supplementary notes`;
   const value=result.lines.join('\n');setText(value);setSources(result.sources);setLabel(name);remember(value,result.sources,name);
   setNotice(aiIssue?`${aiIssue} Loaded available source excerpts instead; these are not a new AI response. Review them, then click Extract notes.`:'Points are ready. Review them, then click Extract notes.');
  }catch(reason){if(turn===epoch.current){
   const fallback=localPreview();
   if(fallback.length&&!text.trim()){
    const value=fallback.join('\n'),name='Current lesson source excerpt · not a new AI response';
    setText(value);setSources([]);setLabel(name);remember(value,[],name);
    setNotice(`${aiIssue?aiIssue+' ':''}Online retrieval failed. Showing readable source text already attached to this topic. It may overlap existing notes and does not supply a missing activity.`);
   }else setNotice(`${aiIssue?aiIssue+' ':''}${friendly(reason)} ${text.trim()?'Your previous preview is kept.':'No readable points are available yet. Paste checked notes into Review notes, or retry after the service is restored.'}`);
  }}finally{if(turn===epoch.current){pending.current=false;setBusy(false);}}
 }
 return <section aria-label={`Extract notes for ${scope.topic}`} className="space-y-4">
  <section className="space-y-2" aria-label="Slide-based request">
   <h3 className="font-semibold text-sky-950">1. Send your request · {preset?.label||'Topic notes'}</h3>
   <p className="my-2 text-sm text-slate-600">The request is ready. Click Send request, or edit it first.</p>
   <div className="mb-2 flex flex-wrap gap-2">
    <Button size="sm" variant={manual?'outline':'default'} aria-pressed={!manual} disabled={busy} onClick={()=>{setManual(false);setRequest(preset?.request||`Explain ${scope.topic} in clear teaching points`);}}>Autofill from slide</Button>
    <Button size="sm" variant={manual?'default':'outline'} aria-pressed={manual} disabled={busy} onClick={()=>{setManual(true);setRequest('');requestEditor.current?.focus();}}>Write my own</Button>
   </div>
   <label htmlFor="simple-topic-request" className="sr-only">Editable request for {scope.topic}</label>
   <Textarea ref={requestEditor} id="simple-topic-request" rows={3} maxLength={2000} disabled={busy} value={request} onChange={event=>{setManual(true);setRequest(event.target.value);}}/>
   <Button className="mt-2" disabled={busy||request.trim().length<3} onClick={()=>void load(true)}>{busy?'Preparing notes…':'Send request'}</Button>

  </section>
  {notice&&<p role="status" className="text-sm text-sky-900">{notice}</p>}
  <label htmlFor="simple-topic-notes" className="block font-semibold">2. Review notes · {scope.topic}</label>
  <Textarea id="simple-topic-notes" rows={5} maxLength={200000} value={text} disabled={busy} onChange={event=>{setText(event.target.value);setLabel('Edited teacher notes');setNotice('');remember(event.target.value,sources,'Edited teacher notes');}} placeholder="Notes appear here. Or paste notes here, with one point per line."/>
  {!!lines.length&&<>
   <p className="text-xs text-slate-600">{label} · {lines.length} points</p>
   <details><summary className="cursor-pointer text-sm font-semibold">Preview formatted points</summary><ol className="mt-3 list-decimal space-y-3 pl-6">{lines.map((line,index)=><li key={index}>{isMathematics(scope.subject)?<MathematicsProse text={line}/>:<MathText subject={scope.subject} text={line}/>}</li>)}</ol></details>
   {sources.map(source=><a key={source.url} className="block text-xs text-sky-800 underline" href={source.url} target="_blank" rel="noopener noreferrer">Reference: {source.title}</a>)}
  </>}
  <div className="sticky bottom-0 z-10 border-t bg-background py-3"><Button className="font-bold" disabled={busy||!valid} onClick={()=>{if(onExtract(lines,sources)!==false)setNotice('Notes extracted into this topic. Extra slides are created automatically when needed.');}}>Extract notes</Button><p className="mt-1 text-xs text-slate-600">Adds these points to the topic and saves automatically. Extra slides adjust when needed.</p>{!lines.length&&<p className="mt-1 text-xs text-slate-600">Send a request above, or paste notes, to enable extraction.</p>}</div>
  {!!lines.length&&!valid&&<p role="alert" className="text-sm text-amber-800">Use up to 500 points, each under 1,800 characters. Split long paragraphs onto separate lines.</p>}

  <details><summary className="cursor-pointer text-sm font-semibold">Other option: get source notes without AI</summary><Button className="mt-2" variant="outline" disabled={busy} onClick={()=>void load()}>Get topic notes</Button><p className="mt-2 text-xs text-slate-600">Requires readable matching source text. You can also paste your own notes into the review field.</p></details>

 </section>;
}
