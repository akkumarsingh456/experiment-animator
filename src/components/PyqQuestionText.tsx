import {presentPyq} from '@/lib/pyq-presentation';

export function PyqQuestionText({text,subject,layoutText}:{text:string;subject:string;layoutText?:string}){
 const view=presentPyq(text,subject,layoutText);
 return <div className="space-y-3">
  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-base leading-8 text-slate-950 selection:bg-amber-100 sm:p-6 sm:text-lg">
   {!view.text?<p className="font-medium text-slate-700">Readable English text is not available for this question. Open the original CBSE PDF and check its English version.</p>:view.code?<pre className="overflow-x-auto whitespace-pre font-mono text-sm leading-7">{view.text}</pre>:view.text.split('\n').map((line,index)=>{
    if(!line.trim())return <div key={index} className="h-2"/>;
    if(/^\s*OR\s*$/i.test(line))return <div key={index} className="my-3 flex items-center gap-3 text-sm font-semibold text-slate-600"><span className="h-px flex-1 bg-slate-200"/>OR<span className="h-px flex-1 bg-slate-200"/></div>;
    const subpart=line.match(/^\s*\((?:[a-z]|[ivx]+)\)/i);
    return <p key={index} className={`max-w-[85ch] whitespace-pre-wrap break-words ${subpart?'mt-3 pl-3':''}`}>{subpart?<><strong className="font-bold text-sky-950">{subpart[0]}</strong>{line.slice(subpart[0].length)}</>:line}</p>;
   })}
  </div>
  {view.warnings.length>0&&<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><p className="font-semibold">Source review needed</p><ul className="mt-1 list-disc space-y-1 pl-5">{view.warnings.map(warning=><li key={warning}>{warning}</li>)}</ul></div>}
  <p className="text-xs text-slate-600">{view.layoutApplied?'AI layout checked · spacing only. ':''}English source wording retained. Check equations, tables and diagrams against the linked PDF; missing symbols are not guessed.</p>
  {!view.hiddenHindi&&<details className="text-xs text-slate-600"><summary className="cursor-pointer">Original extracted text{view.removed?' · page furniture hidden above':''}</summary><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded border p-3 font-mono">{text}</pre></details>}
 </div>;
}
