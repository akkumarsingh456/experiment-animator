import {useEffect,useRef,useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {draftMissingTopicPoints} from '@/lib/missing-topic-ai.functions';
import {Button} from './ui/button';
import {Textarea} from './ui/textarea';
import {MathText} from './MathText';
import {MathematicsProse} from './MathematicsProse';
import {isMathematics} from '@/lib/mathematics-presentation';

type Source={url:string;title:string};
type Message={id:string;role:'user'|'assistant';text:string;lines?:string[];sources?:Source[]};
type Props={scope:{klass:string;subject:string;chapter:string;topic:string};onExtract:(lines:string[],sources:Source[])=>void};

/** Conversation stays in this recovery popup; only explicit extraction updates a lesson. */
export function TopicNotesChat({scope,onExtract}:Props){
 const request=useServerFn(draftMissingTopicPoints);
 const [messages,setMessages]=useState<Message[]>([]),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[imported,setImported]=useState('');
 const sequence=useRef(0),pending=useRef(false),end=useRef<HTMLDivElement>(null);
 const identity=JSON.stringify(scope);
 useEffect(()=>{sequence.current++;pending.current=false;setBusy(false);setMessages([]);setError('');setInput('');setImported('');return()=>{sequence.current++;};},[identity]);
 useEffect(()=>{end.current?.scrollIntoView({block:'nearest',behavior:'smooth'});},[messages,busy]);
 async function send(value:string){
  const text=value.trim();if(text.length<3||pending.current)return;
  pending.current=true;setBusy(true);setError('');setInput('');
  const turn=++sequence.current;
  const history=messages.slice(-8).map(message=>({role:message.role,text:message.text.slice(0,16000)}));
  setMessages(current=>[...current,{id:crypto.randomUUID(),role:'user',text}]);
  try{
   const response=await request({data:{...scope,recoveryOnly:true,request:text,history}});
   if(turn!==sequence.current)return;
   setMessages(current=>[...current,{id:crypto.randomUUID(),role:'assistant',text:response.lines.join('\n'),lines:response.lines,sources:response.sources}]);
  }catch(reason){if(turn===sequence.current){setError(reason instanceof Error?reason.message:'The assistant could not respond. Retry your message.');setInput(text);}}
  finally{if(turn===sequence.current){pending.current=false;setBusy(false);}}
 }
 return <section aria-label="Topic notes AI chat" className="space-y-4">
  <p className="text-sm text-slate-600">Ask for explanations, important points or a more detailed version of <strong>{scope.topic}</strong>. Review the reply, then extract it into this topic. Existing NCERT topics are preserved.</p>
  <div role="log" aria-label="Topic conversation" aria-live="polite" aria-busy={busy} className="max-h-[45dvh] min-h-40 space-y-5 overflow-y-auto border-y py-4">
   {!messages.length&&<div><p className="font-semibold">What notes would you like to prepare?</p><p className="mt-1 text-sm">Replies appear here as numbered, source-supported teaching points.</p></div>}
   {messages.map(message=><article key={message.id} className={message.role==='user'?'ml-6 border-l-2 border-slate-300 pl-3':'space-y-3'}>
    <h3 className="text-sm font-bold text-sky-900">{message.role==='user'?'You':`AI topic assistant · ${scope.topic}`}</h3>
    {message.lines?<><p className="text-xs text-slate-600">Supplementary AI notes · supported by official evidence · review before teaching</p><ol className="list-decimal space-y-3 pl-6">{message.lines.map((line,index)=><li key={index} className="leading-relaxed">{isMathematics(scope.subject)?<MathematicsProse text={line}/>:<MathText subject={scope.subject} text={line}/>}</li>)}</ol>
     <div className="flex flex-wrap gap-2">{message.sources?.map(source=><a key={source.url} className="text-xs text-sky-800 underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>)}</div>
     <Button disabled={busy} onClick={()=>{onExtract(message.lines!,message.sources||[]);setImported(message.id);}}>{imported===message.id?'Extracted · update these notes':'Extract notes'}</Button>
    </>:<p className="whitespace-pre-wrap break-words">{message.text}</p>}
   </article>)}
   {busy&&<p role="status" className="text-sm font-semibold text-sky-900">Preparing topic notes from official evidence…</p>}<div ref={end}/>
  </div>
  <div className="flex flex-wrap gap-2">{[`Explain ${scope.topic} in clear teaching points`,`Give detailed notes on ${scope.topic} with definitions and conditions`,`Explain a source example of ${scope.topic} step by step`].map(prompt=><Button key={prompt} className="h-auto whitespace-normal text-left" size="sm" variant="outline" disabled={busy} onClick={()=>void send(prompt)}>{prompt}</Button>)}</div>
  <form className="space-y-2" onSubmit={event=>{event.preventDefault();void send(input);}}>
   <label htmlFor="topic-chat-request" className="block text-sm font-semibold">Ask about {scope.topic}</label>
   <Textarea id="topic-chat-request" rows={3} maxLength={2000} disabled={busy} value={input} onChange={event=>setInput(event.target.value)} placeholder={`Ask for point-wise notes or a supported example of ${scope.topic}…`}/>
   <Button type="submit" disabled={busy||input.trim().length<3}>{busy?'Writing…':'Send message'}</Button>
  </form>
  {error&&<p role="alert" className="text-sm text-red-800">{error}</p>}
  {!!imported&&<p role="status" className="text-sm text-emerald-800">Notes added to the current topic. Continuation slides are created automatically as needed. The popup stays open for follow-up questions.</p>}
 </section>;
}
