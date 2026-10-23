import {useEffect,useState} from 'react';
import {cbsePapers} from '@/lib/cbse-pyq';
import {pyqPdfHref,type PyqReading} from '@/lib/cbse-pyq-questions';
import {Button} from './ui/button';
type Paper=typeof cbsePapers[number];
type Props={papers:Paper[];files:Record<string,{name:string;size:number}[]>;loadingPaper:string;busy:boolean;readings:PyqReading[];onLoad:(paper:Paper)=>void;onRead:(paper:Paper,file:string)=>void};
export function PyqSourceBrowser({papers,files,loadingPaper,busy,readings,onLoad,onRead}:Props){
 const [chosenYear,setChosenYear]=useState<number|null>(null),[chosenExam,setChosenExam]=useState('Main'),[search,setSearch]=useState('');
 const years=[...new Set(papers.map(paper=>paper.year))].sort((a,b)=>b-a),year=years.includes(chosenYear||0)?chosenYear!:years[0];
 const choices=papers.filter(paper=>paper.year===year),paper=choices.find(paper=>paper.exam===chosenExam)||choices.find(paper=>paper.exam==='Main')||choices[0];
 const available=paper?files[paper.url]:undefined,matching=available?.filter(file=>file.name.toLowerCase().includes(search.trim().toLowerCase()))||[];
 useEffect(()=>setSearch(''),[paper?.url]);
 function label(file:string){const name=file.split('/').at(-1)||file,code=name.match(/(?:^|[_ ])(\d{1,3}-\d{1,3}-\d{1,3})(?=[_. ]|$)/)?.[1];return code?`Paper set ${code}`:name.replace(/\.pdf$/i,'').replace(/_/g,' ');}
 return <section className="space-y-4 rounded-xl border bg-white p-4 sm:p-5" aria-label="Choose an original CBSE paper">
   <div><h3 className="text-lg font-semibold">Choose an original paper</h3><p className="mt-1 text-sm text-slate-500">Choose a year and examination, then open a PDF or extract its questions as text.</p></div>
   {!papers.length?<p className="rounded-lg bg-slate-50 p-4 text-sm">No original paper is indexed for the current class, subject and year filters.</p>:<>
     <div className="flex flex-wrap gap-2" aria-label="Source paper year">{years.map(value=><Button key={value} size="sm" variant={year===value?'default':'outline'} aria-pressed={year===value} onClick={()=>{setChosenYear(value);setSearch('');}}>{value}</Button>)}</div>
     <div className="flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-3"><label className="w-full text-sm font-medium sm:min-w-0 sm:flex-1">Examination<select aria-label="Source paper examination" className="mt-1 w-full rounded-lg border bg-white p-2.5" value={paper.exam} onChange={event=>{setChosenExam(event.target.value);setSearch('');}}>{choices.map(choice=><option key={choice.url} value={choice.exam}>{choice.exam} · {choice.year}</option>)}</select></label><Button size="sm" variant="outline" disabled={loadingPaper===paper.url||!!available} onClick={()=>onLoad(paper)}>{loadingPaper===paper.url?'Loading paper sets…':available?'Paper sets shown':'Show paper sets'}</Button></div>
     {!available?<div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">Select <strong>Show paper sets</strong> to see the individual PDFs for {year} · {paper.exam}.</div>:<>
       <label className="block text-sm font-medium">Find a paper set<input type="search" aria-label="Find source paper set" className="mt-1 w-full rounded-lg border p-2.5" placeholder="Search by set code or filename…" value={search} onChange={event=>setSearch(event.target.value)}/></label>
       <p className="text-xs text-slate-500">{matching.length} of {available.length} paper sets · {year} · {paper.exam}</p>
       <div className="max-h-[32rem] space-y-2 overflow-auto pr-1">{matching.map(file=>{const reading=readings.find(reading=>reading.url===paper.url&&reading.file===file.name);return <article key={file.name} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h4 className="break-words text-sm font-semibold">{label(file.name)}</h4><p className="mt-1 truncate text-xs text-slate-500" title={file.name}>{file.name.split('/').at(-1)}</p><span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${reading?'bg-emerald-50 text-emerald-800':'bg-slate-100 text-slate-500'}`}>{reading?`${reading.questions.length} question blocks available`:'Not read on this device'}</span></div><div className="flex shrink-0 flex-wrap gap-2"><a className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-slate-50" target="_blank" rel="noopener noreferrer" href={pyqPdfHref(paper.url,file.name)}>View PDF</a><Button size="sm" variant={reading?'outline':'default'} disabled={busy} onClick={()=>onRead(paper,file.name)}>{reading?'Read again':'Extract text'}</Button></div></article>;})}</div>
       {!matching.length&&<p className="py-4 text-center text-sm text-slate-500">No paper sets match this search.</p>}
     </>}
   </>}
 </section>;
}
