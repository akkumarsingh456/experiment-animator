import {useEffect,useRef,useState} from 'react';
import {useTeacherAccount} from '@/hooks/use-teacher-account';
import {cbseArchive,cbseCheckedAt,cbsePapers,pyqDraftKey,pyqKey,pyqSubjectMatches,pyqYears,type PyqScope} from '@/lib/cbse-pyq';
import {findPyqPassages,readPyqNote,savePyqNote} from '@/lib/cbse-pyq.functions';
import {Button} from './ui/button';

type Addition={key:string;text:string;id:number};
function PyqNotebook({scope,email,addition,onConsumed}:{scope:PyqScope;email:string;addition:Addition|null;onConsumed:()=>void}){
 const key=pyqDraftKey(email||'anonymous',scope);
 const [draft]=useState(()=>{try{const raw=localStorage.getItem(key);if(!raw)return null;const value=JSON.parse(raw);return typeof value.text==='string'&&value.text.length<=12000?value as {text:string;baseRevision:string}:null;}catch{return null;}});
 const [text,setText]=useState(draft?.text||''),[revision,setRevision]=useState(''),[loading,setLoading]=useState(!!email),[saving,setSaving]=useState(false),[ready,setReady]=useState(!email),[status,setStatus]=useState(draft?'Device draft restored.':'');
 const lastAddition=useRef<number|null>(null),latest=useRef(text);latest.current=text;
 useEffect(()=>{let active=true;if(!email)return;setLoading(true);void readPyqNote({data:scope}).then(record=>{
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
 return <div className="mt-4 rounded-xl border bg-white p-4"><h3 className="font-semibold">My PYQ teaching notes</h3><p className="my-2 text-xs text-slate-600">Class {scope.klass} · {scope.subject} · {scope.chapter||'General'} · {scope.topic||'General'} · {scope.year}. Record the paper/set, question number, answer steps and points to explain. These notes never enter lecture slides.</p>
   <textarea aria-label="PYQ teaching notes" rows={7} maxLength={12000} disabled={loading} className="w-full rounded-lg border p-3 text-sm" value={text} onChange={event=>edit(event.target.value)} placeholder="Paper / set / question number:\nKey concept:\nAnswer steps and marking points:\nCommon mistakes:\nMy teaching reminder:"/>
   <div className="mt-2 flex flex-wrap items-center gap-3"><Button size="sm" disabled={!email||!ready||loading||saving} onClick={save}>{saving?'Saving…':'Save PYQ notes'}</Button><span className="text-xs text-slate-600">{email?'Private cloud save + device drafts':'Sign in for cloud saving. Drafts stay on this device.'}</span></div>
   <p role="status" className="mt-2 text-xs text-slate-600">{loading?'Loading your private notes…':status}</p>
 </div>;
}

type Props={klass?:string;subject?:string;chapter?:string;topics?:string[];guided?:boolean};
export function TeacherPyqPanel({klass:initialClass='10',subject:initialSubject='Science',chapter:initialChapter='',topics=[],guided=false}:Props){
 const {account,checking}=useTeacherAccount(),email=account?.signedIn?account.email:'';
 const years=pyqYears(),[klass,setKlass]=useState(initialClass),[subject,setSubject]=useState(initialSubject),[chapter,setChapter]=useState(initialChapter),[topic,setTopic]=useState(topics[0]||'');
 const [year,setYear]=useState(years[0]),[query,setQuery]=useState(topics[0]||''),[selected,setSelected]=useState(''),[file,setFile]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [result,setResult]=useState<Awaited<ReturnType<typeof findPyqPassages>>|null>(null),[addition,setAddition]=useState<Addition|null>(null);
 const [scopeEditing,setScopeEditing]=useState(false);
 const request=useRef(0);
 const board=klass==='10'||klass==='12',scope:PyqScope={klass:klass as PyqScope['klass'],subject,chapter,topic,year};
 const papers=cbsePapers.filter(p=>p.klass===klass&&p.year===year&&pyqSubjectMatches(p.subject,subject));
 const subjects=[...new Set([...cbsePapers.filter(p=>p.klass===klass).map(p=>p.subject),...(klass==='9'?['Science','Social Science','Mathematics','Computer Science']:klass==='11'?['Physics','Chemistry','Mathematics','Computer Science']:[]),subject])].sort();
 const archiveYears=[...new Set([...years,...cbsePapers.map(p=>p.year)])].sort((a,b)=>b-a);
 // Invalidate any in-flight search when its paper or teaching scope changes.
 useEffect(()=>{request.current++;setBusy(false);setResult(null);setFile('');setError('');setSelected('');},[klass,subject,chapter,topic,year,email]);
 useEffect(()=>()=>{request.current++;},[]);
 async function search(){
   const paper=papers.find(p=>p.url===selected);if(!paper)return;
   const run=++request.current;setBusy(true);setError('');setResult(null);
   try{const value=await findPyqPassages({data:{url:paper.url,klass:klass as '10'|'12',subject,year,topic:query,file:file||undefined}});if(run===request.current){setResult(value);setFile(value.fileName);}}
   catch(error){if(run===request.current)setError(error instanceof Error?error.message:'Paper text could not be searched. Use the official download.');}
   finally{if(run===request.current)setBusy(false);}
 }
 return <section aria-label={guided?'Topic PYQs for teacher guide':'CBSE previous-year papers'} className="my-6 rounded-xl border border-sky-200 bg-sky-50/50 p-4 sm:p-5 print:hidden" data-pyq-teacher-only="true">
   <h2 className="text-xl font-semibold">{guided?'PYQs for this lecture · teacher reference':'CBSE PYQ library & teaching notebook'}</h2>
   <p className="my-2 text-sm text-slate-600">{guided?`Review official papers from ${years.at(-1)}–${years[0]} for the selected lecture topic.`:'Find official papers by class, subject and year. Keep a separate teaching notebook for each chapter, topic and year.'} Papers and notes are kept outside lecture PPTs.</p>
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
     <label className="text-sm">Class<select aria-label="PYQ class" disabled={guided} className="mt-1 w-full rounded-lg border bg-white p-2" value={klass} onChange={event=>{setKlass(event.target.value);setSubject(event.target.value==='10'||event.target.value==='9'?'Science':'Physics');}}>{['9','10','11','12'].map(value=><option key={value} value={value}>Class {value}</option>)}</select></label>
     <label className="text-sm">Subject{guided?<input readOnly className="mt-1 w-full rounded-lg border bg-white p-2" value={subject}/>:<select aria-label="PYQ subject" className="mt-1 w-full rounded-lg border bg-white p-2" value={subject} onChange={event=>setSubject(event.target.value)}>{subjects.map(value=><option key={value}>{value}</option>)}</select>}</label>
     <label className="text-sm">Exam year<select aria-label="PYQ year" className="mt-1 w-full rounded-lg border bg-white p-2" value={year} onChange={event=>setYear(Number(event.target.value))}>{(guided?years:archiveYears).map(value=><option key={value}>{value}</option>)}</select></label>
     <label className="text-sm">Chapter<input aria-label="PYQ chapter" onFocus={()=>{if(!guided)setScopeEditing(true);}} onBlur={()=>setScopeEditing(false)} readOnly={guided} maxLength={300} className="mt-1 w-full rounded-lg border bg-white p-2" value={chapter} onChange={event=>setChapter(event.target.value)}/></label>
   </div>
   <label className="my-3 block text-sm">Lecture topic{guided&&topics.length?<select aria-label="PYQ lecture topic" className="mt-1 w-full rounded-lg border bg-white p-2" value={topic} onChange={event=>{setTopic(event.target.value);setQuery(event.target.value);}}>{topics.map(value=><option key={value}>{value}</option>)}</select>:<input aria-label="PYQ topic" onFocus={()=>setScopeEditing(true)} onBlur={()=>setScopeEditing(false)} maxLength={300} className="mt-1 w-full rounded-lg border bg-white p-2" value={topic} onChange={event=>{setTopic(event.target.value);setQuery(event.target.value);}}/>}</label>
   {!board&&<p className="my-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">Classes 9 and 11 have school-conducted examinations, not CBSE board PYQs. Use the notebook for your school's past-paper references; Class 10/12 papers are not substitutes for this class.</p>}
   <div className="my-3 flex flex-wrap gap-3 text-sm"><a className="underline" href={cbseArchive} target="_blank" rel="noopener noreferrer">All official CBSE papers</a><a className="underline" href="https://www.cbse.gov.in/cbsenew/marking-scheme.html" target="_blank" rel="noopener noreferrer">Official marking schemes</a></div>
   {board&&<><p className="text-xs text-slate-600">Archive checked {cbseCheckedAt}. Includes main and additional examinations where published. ZIP links contain paper sets; download and open the PDFs inside.</p>
     {!papers.length&&<p role="status" className="my-3 text-sm">No exact class/subject/year paper is indexed here. Check the official archive; no question is invented or substituted.</p>}
     <ul className="my-3 grid max-h-72 gap-2 overflow-auto sm:grid-cols-2">{papers.map(p=><li key={p.url} className="rounded-lg border bg-white p-3 text-sm"><strong>{p.year} · {p.subject} · {p.exam}</strong><p><a href={p.url} target="_blank" rel="noopener noreferrer" className="underline">{p.format==='ZIP'?'Download all published sets (ZIP)':'View official paper (PDF)'}</a></p><Button size="sm" variant="outline" className="mt-2" onClick={()=>{request.current++;setBusy(false);setSelected(p.url);setFile('');setResult(null);setError('');}}>Use for topic search</Button></li>)}</ul>
     {!!papers.length&&<div className="rounded-lg border bg-white p-3"><h3 className="font-semibold">Find topic references in the original paper</h3><p className="my-2 text-xs text-slate-600">Choose a paper above, then search using a specific concept. Matches are original PDF page excerpts, not verified complete questions or AI-generated PYQs. Review the paper/set and question number before using them.</p>
       <input aria-label="PYQ topic keywords" maxLength={300} className="w-full rounded-lg border p-2 text-sm" value={query} onChange={event=>{request.current++;setBusy(false);setQuery(event.target.value);setResult(null);}} placeholder="For example: Werner primary secondary valency"/>
       {selected&&<p className="mt-2 text-xs">Selected: {papers.find(p=>p.url===selected)?.exam} · {year} · {subject}</p>}
       {result&&result.files.length>1&&<label className="my-2 block text-sm">PDF set<select className="ml-2 max-w-full rounded border p-2" value={file} onChange={event=>setFile(event.target.value)}>{result.files.map(name=><option key={name}>{name}</option>)}</select></label>}
       <Button size="sm" className="mt-2" disabled={busy||!email||!selected||query.trim().length<3||!years.includes(year)} onClick={search}>{busy?'Searching original PDF…':'Find matching pages'}</Button>
       {!email&&<p className="mt-2 text-xs">Sign in to search PDF text. Official download links remain available.</p>}
       {!years.includes(year)&&<p className="mt-2 text-xs">Inline topic search covers the latest five calendar years. Older papers remain available to download.</p>}
       {error&&<p role="alert" className="mt-2 text-sm text-amber-800">{error}</p>}
       {result&&<div className="mt-3"><p className="text-xs">Searched {result.pagesScanned} of {result.totalPages} pages in {result.fileName}. {result.files.length>1?`${result.files.length} PDF files available; choose each set to search it.`:''}</p>{!result.hits.length&&<p className="my-2 text-sm">No keyword match found in the scanned text. This does not prove the topic was absent; scanned images and mathematical notation may not be searchable. Review the original paper.</p>}{result.hits.map(hit=><article key={hit.page} className="my-2 rounded-lg border p-3"><h4 className="text-sm font-semibold">{year} · {result.fileName} · PDF page {hit.page}</h4><p className="my-2 whitespace-pre-wrap break-words text-sm">…{hit.text}…</p><Button size="sm" variant="outline" onClick={()=>setAddition({key:pyqKey(scope),id:Date.now(),text:`${year} · ${subject} · ${result.fileName} · PDF page ${hit.page}\nSource: ${selected}\nTopic-search excerpt (verify the question in the original paper):\n${hit.text}\nMy answer steps / teaching note:`})}>Add reference to my PYQ notes</Button></article>)}</div>}
     </div>}
   </>}
   {!checking&&!scopeEditing&&<PyqNotebook key={JSON.stringify([email,pyqKey(scope)])} scope={scope} email={email} addition={addition} onConsumed={()=>setAddition(null)}/>}
 </section>;
}
