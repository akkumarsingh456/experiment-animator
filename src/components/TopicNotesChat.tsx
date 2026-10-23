import type {SlideNoteFormat} from "@/lib/slide-notes-request";
import {useEffect,useRef,useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {draftMissingTopicPoints} from '@/lib/missing-topic-ai.functions';
import {getSimpleTopicNotes} from '@/lib/topic-notes.functions';
import {Button} from './ui/button';
import {Textarea} from './ui/textarea';
import {MathText} from './MathText';
import {MathematicsProse} from './MathematicsProse';
import {isMathematics} from '@/lib/mathematics-presentation';

type Source={url:string;title:string};
type Props={preset?:{request:string;format:SlideNoteFormat;label:string};scope:{klass:string;subject:string;chapter:string;topic:string};onExtract:(lines:string[],sources:Source[])=>void|boolean};

/** One preview and one extraction action; advanced AI is optional. */
export function TopicNotesChat({scope,onExtract,preset}:Props){
 const read=useServerFn(getSimpleTopicNotes),askAI=useServerFn(draftMissingTopicPoints);
 const [text,setText]=useState(''),[sources,setSources]=useState<Source[]>([]),[label,setLabel]=useState('Teacher notes'),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[request,setRequest]=useState(preset?.request||'');
 const epoch=useRef(0),pending=useRef(false),requestEditor=useRef<HTMLTextAreaElement>(null);
 const [manual,setManual]=useState(false);
 const identity=JSON.stringify(scope);
 useEffect(()=>{epoch.current++;pending.current=false;setText('');setSources([]);setLabel('Teacher notes');setBusy(false);setNotice('');setRequest(preset?.request||'');setManual(false);return()=>{epoch.current++;};},[identity]);
 useEffect(()=>{if(!manual)setRequest(preset?.request||`Explain ${scope.topic} in clear teaching points`);},[preset?.request,manual]);
 const lines=text.split(/\n+/).map(line=>line.trim().replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '')).filter(Boolean);
 const valid=lines.length>0&&lines.length<=500&&lines.every(line=>line.length<=1800);
 async function load(ai=false){
  if(pending.current)return;
  pending.current=true;setBusy(true);setNotice('');const turn=++epoch.current;
  try{
   let result;
   let usedSourceFallback=false;
   if(ai){
    try{result=await askAI({data:{...scope,recoveryOnly:true,format:manual?undefined:preset?.format,request:request.trim()||`Explain ${scope.topic} in clear teaching points`,history:[]}});}
    catch{
     // AI availability must not hide already readable official notes.
     result=await read({data:scope});usedSourceFallback=true;
    }
   }else result=await read({data:scope});
   if(turn!==epoch.current)return;
   setText(result.lines.join('\n'));setSources(result.sources);
   setLabel('label' in result?result.label:`${result.provider} supplementary notes`);
   if(usedSourceFallback)setNotice('Loaded source notes because AI rewriting was unavailable. Review the text and click Extract notes.');
  }catch(reason){if(turn===epoch.current)setNotice(reason instanceof Error?reason.message:'Could not load notes. Paste your notes below and extract them.');}
  finally{if(turn===epoch.current){pending.current=false;setBusy(false);}}
 }
 return <section aria-label={`Extract notes for ${scope.topic}`} className="space-y-4">
  <p className="text-sm">Get notes for <strong>{scope.topic}</strong>, review the text, then click <strong>Add to this topic</strong>. You can also paste text from another AI chat or your own notes.</p>
  <Button disabled={busy} onClick={()=>void load()}>{busy?'Getting notes…':`Get topic notes`}</Button>
  <label htmlFor="simple-topic-notes" className="block font-semibold">Read or edit notes · {scope.topic}</label>
  <Textarea id="simple-topic-notes" rows={10} maxLength={200000} value={text} disabled={busy} onChange={event=>{setText(event.target.value);setLabel('Edited teacher notes');setNotice('');}} placeholder="Notes appear here. Or paste notes here, with one point per line."/>
  {!!lines.length&&<>
   <p className="text-xs text-slate-600">{label} · {lines.length} points</p>
   <details><summary className="cursor-pointer text-sm font-semibold">Preview formatted points</summary><ol className="mt-3 list-decimal space-y-3 pl-6">{lines.map((line,index)=><li key={index}>{isMathematics(scope.subject)?<MathematicsProse text={line}/>:<MathText subject={scope.subject} text={line}/>}</li>)}</ol></details>
   {sources.map(source=><a key={source.url} className="block text-xs text-sky-800 underline" href={source.url} target="_blank" rel="noopener noreferrer">Reference: {source.title}</a>)}
  </>}
  <Button disabled={busy||!valid} onClick={()=>{if(onExtract(lines,sources)!==false)setNotice('Notes extracted into this topic. Extra slides are created automatically when needed.');}}>Add to this topic</Button>
  {!!lines.length&&!valid&&<p role="alert" className="text-sm text-amber-800">Use up to 500 points, each under 1,800 characters. Split long paragraphs onto separate lines.</p>}
  {notice&&<p role="status" className="text-sm text-sky-900">{notice}</p>}
  <section className="border-t pt-4" aria-label="Slide-based request">
   <h3 className="font-semibold text-sky-950">Optional: ask for more detail · {preset?.label||'Topic notes'}</h3>
   <p className="my-2 text-sm text-slate-600">Already filled for this slide. Send it as it is, or write your own request.</p>
   <div className="mb-2 flex flex-wrap gap-2">
    <Button size="sm" variant={manual?'outline':'default'} aria-pressed={!manual} disabled={busy} onClick={()=>{setManual(false);setRequest(preset?.request||`Explain ${scope.topic} in clear teaching points`);}}>Autofill from slide</Button>
    <Button size="sm" variant={manual?'default':'outline'} aria-pressed={manual} disabled={busy} onClick={()=>{setManual(true);setRequest('');requestEditor.current?.focus();}}>Write my own</Button>
   </div>
   <label htmlFor="simple-topic-request" className="sr-only">Editable request for {scope.topic}</label>
   <Textarea ref={requestEditor} id="simple-topic-request" rows={5} maxLength={2000} disabled={busy} value={request} onChange={event=>{setManual(true);setRequest(event.target.value);}}/>
   <Button className="mt-2" disabled={busy||request.trim().length<3} onClick={()=>void load(true)}>{busy?'Preparing notes…':'Send request'}</Button>
   <p className="mt-2 text-xs text-slate-600">Send request uses the connected AI. Get topic notes and paste/extract remain available without an AI key.</p>
  </section>
 </section>;
}
