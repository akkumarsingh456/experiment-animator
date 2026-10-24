import type {SlideNoteFormat} from "@/lib/slide-notes-request";
import {useEffect,useRef,useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {draftMissingTopicPoints} from '@/lib/missing-topic-ai.functions';
import {recoverTopicFromSources} from '@/lib/topic-source-recovery';
import {getSimpleTopicNotes} from '@/lib/topic-notes.functions';
import {Button} from './ui/button';
import {Send, FilePlus2, Sparkles, LoaderCircle} from 'lucide-react';
import {Textarea} from './ui/textarea';
import {MathText} from './MathText';
import {MathematicsProse} from './MathematicsProse';
import {isMathematics} from '@/lib/mathematics-presentation';

type Source={url:string;title:string};
type ChatMessage={role:'user'|'assistant';text:string;label?:string};
type Props={sourceText?:string;previewKey?:string;preset?:{request:string;format:SlideNoteFormat;label:string};scope:{klass:string;subject:string;chapter:string;topic:string};onExtract:(lines:string[],sources:Source[])=>void|boolean};

/** One preview and one extraction action; advanced AI is optional. */
export function TopicNotesChat({scope,onExtract,preset,sourceText='',previewKey=''}:Props){
 const read=useServerFn(getSimpleTopicNotes),askAI=useServerFn(draftMissingTopicPoints);
 const [text,setText]=useState(''),[sources,setSources]=useState<Source[]>([]),[label,setLabel]=useState('Teacher notes'),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[request,setRequest]=useState(preset?.request||'');
 const epoch=useRef(0),pending=useRef(false),requestEditor=useRef<HTMLTextAreaElement>(null);
 const [manual,setManual]=useState(false);
 const [provider,setProvider]=useState<'auto'|'gemini'|'groq'>('auto');
 const [messages,setMessages]=useState<ChatMessage[]>([]);
 const endOfChat=useRef<HTMLDivElement>(null);
 const autofill=`Prepare ${preset?.label?.toLowerCase()||'clear teaching points'} about ${scope.topic} for Class ${scope.klass} ${scope.subject}, ${scope.chapter}. Include relevant explanations and conditions for this class.`;
 const identity=JSON.stringify(scope);
 const cacheKey='eduplan-topic-preview-v1:'+JSON.stringify([identity,previewKey]);
 function remember(value:string,refs:Source[],name:string){try{localStorage.setItem(cacheKey,JSON.stringify({text:value,sources:refs,label:name}));}catch{/* Lesson saving still reports its own device/cloud status. */}}
 function friendly(reason:unknown){const message=reason instanceof Error?reason.message:'';return /Connect Gemini|not configured/i.test(message)?'The website AI service is not configured. Try Auto or ask the site owner to connect it.':message||'The notes service did not respond.';}
 // Full textbook volumes need server chapter scoping before they can become notes.
 const localPreview=()=>sourceText&&sourceText.length<=12000?recoverTopicFromSources(scope.topic,[sourceText]).lines.filter(line=>line.length<=1800).slice(0,500):[];
 useEffect(()=>{epoch.current++;pending.current=false;setText('');setSources([]);setLabel('Teacher notes');setBusy(false);setNotice('');setRequest(autofill);setManual(false);setMessages([]);setProvider('auto');
  try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');if(cached&&typeof cached.text==='string'&&cached.text.length<=200000){setText(cached.text);if(cached.text.trim())setMessages([{role:'assistant',text:cached.text,label:typeof cached.label==='string'?cached.label:'Saved preview'}]);setSources(Array.isArray(cached.sources)?cached.sources.filter((ref:Source)=>typeof ref?.url==='string'&&/^https?:\/\//.test(ref.url)&&typeof ref.title==='string'):[]);setLabel(typeof cached.label==='string'?cached.label:'Saved preview');}}catch{}
  return()=>{epoch.current++;};},[identity,cacheKey]);
 useEffect(()=>{if(!manual)setRequest(autofill);},[autofill,manual]);
 useEffect(()=>{endOfChat.current?.scrollIntoView?.({block:'nearest',behavior:'smooth'});},[messages,busy]);
 const lines=text.split(/\n+/).map(line=>line.trim().replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '')).filter(Boolean);
 const valid=lines.length>0&&lines.length<=500&&lines.every(line=>line.length<=1800);
 async function load(ai=false){
  if(pending.current)return;
  pending.current=true;setBusy(true);setNotice('');const turn=++epoch.current;
  let aiIssue='';
  const sent=request.trim()||autofill;
  const history=messages.slice(-6).map(({role,text})=>({role,text:text.slice(0,16000)}));
  if(ai)setMessages(current=>[...current.slice(-11),{role:'user',text:sent}]);
  try{
   let result;
   if(ai){
    try{result=await askAI({data:{...scope,recoveryOnly:true,provider,format:manual?undefined:preset?.format,request:sent,history}});
     if(!result.lines?.length)throw new Error('The AI returned no usable points.');
    }catch(reason){aiIssue=friendly(reason);result=await read({data:scope});}
   }else result=await read({data:scope});
   if(turn!==epoch.current)return;
   if(!result.lines?.length||result.lines.length>500||result.lines.some(line=>!line.trim()||line.length>1800))throw new Error('The service did not return usable points.');
   const name='label' in result?result.label:`${result.provider} supplementary notes`;
   const value=result.lines.join('\n');setText(value);setSources(result.sources);setLabel(name);remember(value,result.sources,name);setMessages(current=>[...current.slice(-11),{role:'assistant',text:value,label:name}]);
   setNotice(aiIssue?`${aiIssue} Loaded available source excerpts instead; these are not a new AI response. Review them, then click Insert notes.`:'Points are ready. Review them, then click Insert notes.');
  }catch(reason){if(turn===epoch.current){
   const fallback=localPreview();
   if(fallback.length&&!text.trim()){
    const value=fallback.join('\n'),name='Current lesson source excerpt · not a new AI response';
    setText(value);setSources([]);setLabel(name);remember(value,[],name);setMessages(current=>[...current.slice(-11),{role:'assistant',text:value,label:name}]);
    setNotice(`${aiIssue?aiIssue+' ':''}Online retrieval failed. Showing readable source text already attached to this topic. It may overlap existing notes and does not supply a missing activity.`);
   }else setNotice(`${aiIssue?aiIssue+' ':''}${friendly(reason)} ${text.trim()?'Your previous preview is kept.':'No readable points are available yet. Paste checked notes under Edit or paste notes, or retry after the service is restored.'}`);
  }}finally{if(turn===epoch.current){pending.current=false;setBusy(false);}}
 }
 return <section aria-label={`Extract notes for ${scope.topic}`} className="flex min-h-0 flex-col gap-3">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <p className="text-sm font-medium text-sky-950">Ask about this topic, then insert the reply into your lesson.</p>
   <label className="flex items-center gap-2 text-sm"><span className="font-semibold">AI</span><select aria-label="AI provider" value={provider} disabled={busy} onChange={event=>setProvider(event.target.value as typeof provider)} className="min-h-10 rounded-lg border bg-white px-2"><option value="auto">Auto · recommended</option><option value="gemini">Gemini</option><option value="groq">Groq</option></select></label>
  </div>
  <div role="log" aria-label={`Chat about Class ${scope.klass} ${scope.subject} ${scope.topic}`} aria-live="polite" aria-busy={busy} className="min-h-[180px] max-h-[38dvh] space-y-4 overflow-y-auto overscroll-contain rounded-xl border bg-white p-4 sm:p-5">
   {!messages.length&&<div className="py-5 text-center"><Sparkles className="mx-auto mb-3 h-7 w-7 text-sky-700" aria-hidden="true"/><p className="font-semibold text-slate-900">How can I help you teach {scope.topic}?</p><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">Your Class {scope.klass} {scope.subject} request is already filled below. Click Send to get notes.</p></div>}
   {messages.map((message,index)=><article key={index} className={message.role==='user'?'ml-auto max-w-[95%] rounded-xl bg-sky-50 px-4 py-3 text-sm sm:max-w-[85%]':'space-y-2 border-b border-slate-100 pb-4 last:border-0'}>
    <p className="text-xs font-bold text-sky-900">{message.role==='user'?'You':message.label||'Topic assistant'}</p>
    {message.role==='user'?<p className="whitespace-pre-wrap break-words leading-6">{message.text}</p>:<ol className="list-decimal space-y-3 pl-5 text-[15px] leading-7">{message.text.split(/\n+/).filter(Boolean).map((line,at)=><li key={at}>{isMathematics(scope.subject)?<MathematicsProse text={line}/>:<MathText subject={scope.subject} text={line}/>}</li>)}</ol>}
   </article>)}
   {busy&&<p role="status" className="flex items-center gap-2 text-sm text-sky-800"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true"/>Preparing notes for this class and topic…</p>}
   <div ref={endOfChat}/>
  </div>
  {notice&&<p role="status" className="text-sm leading-6 text-sky-900">{notice}</p>}
  <form className="sticky bottom-0 z-10 rounded-xl border bg-white p-3 shadow-sm" onSubmit={event=>{event.preventDefault();if(!busy&&request.trim().length>=3)void load(true);}}>
   <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><label htmlFor="simple-topic-request" className="text-sm font-semibold">Your request · Class {scope.klass} · {scope.topic}</label><div className="flex gap-2"><Button type="button" size="sm" variant="ghost" disabled={busy} onClick={()=>{setManual(false);setRequest(autofill);}}>Autofill from slide</Button><Button type="button" size="sm" variant="ghost" disabled={busy} onClick={()=>{setManual(true);setRequest('');requestEditor.current?.focus();}}>Write my own</Button></div></div>
   <Textarea ref={requestEditor} id="simple-topic-request" aria-label={`Request for Class ${scope.klass} ${scope.subject} ${scope.topic}`} rows={2} maxLength={2000} disabled={busy} value={request} onChange={event=>{setManual(true);setRequest(event.target.value);}} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();if(!busy&&request.trim().length>=3)void load(true);}}} placeholder={`Ask about ${scope.topic} for Class ${scope.klass}…`} className="min-h-[76px] resize-y border-0 bg-transparent px-1 text-base shadow-none focus-visible:ring-0"/>
   <div className="mt-3 grid grid-cols-2 gap-3">
    <Button type="submit" className="min-h-11 gap-2" disabled={busy||request.trim().length<3}>{busy?<LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true"/>:<Send className="h-4 w-4" aria-hidden="true"/>}{busy?'Preparing…':'Send'}</Button>
    <Button type="button" className="min-h-11 gap-2 bg-emerald-700 font-bold hover:bg-emerald-800" disabled={busy||!valid} title="Extract the reviewed points into this topic" onClick={()=>{if(onExtract(lines,sources)!==false)setNotice('Notes inserted into this topic. Saving is automatic; extra slides adjust when needed.');}}><FilePlus2 className="h-4 w-4" aria-hidden="true"/>Insert notes</Button>
   </div>
   <p className="mt-2 text-xs leading-5 text-slate-600">{lines.length?`${lines.length} points ready to insert. Review the latest reply first.`:'Send gets a reply. Insert notes adds the reviewed points to your lesson and saves automatically.'}</p>
  </form>
  {!!lines.length&&!valid&&<p role="alert" className="text-sm text-amber-800">Use up to 500 points, each under 1,800 characters. Split long paragraphs onto separate lines.</p>}
  <details className="text-sm"><summary className="cursor-pointer font-semibold text-sky-900">Edit or paste notes</summary><label htmlFor="simple-topic-notes" className="my-2 block font-medium">Review notes · {scope.topic}</label><Textarea id="simple-topic-notes" rows={5} maxLength={200000} value={text} disabled={busy} onChange={event=>{setText(event.target.value);setLabel('Edited teacher notes');setNotice('');remember(event.target.value,sources,'Edited teacher notes');}} placeholder="Paste checked notes here, one point per line."/><p className="mt-1 text-xs text-slate-600">{label}. Insert notes uses the points in this field.</p></details>
  <details className="text-sm"><summary className="cursor-pointer text-slate-600">Sources and other options</summary><Button type="button" className="my-2" size="sm" variant="outline" disabled={busy} onClick={()=>void load()}>Use textbook notes</Button>{sources.map(source=><a key={source.url} className="my-1 block text-xs text-sky-800 underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>)}<p className="mt-2 text-xs leading-5 text-slate-500">Gemini and Groq use the website’s server connection. Teachers do not need to enter an API key. Auto tries available providers; if AI is unavailable, readable source excerpts are shown with their source label.</p></details>
 </section>;
}
