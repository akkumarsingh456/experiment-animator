import {presentPyq} from '@/lib/pyq-presentation';

export function PyqQuestionText({text,subject}:{text:string;subject:string}){
 const view=presentPyq(text,subject);
 return <div className="space-y-3">
  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-base leading-8 sm:p-5">
   {view.code?<pre className="overflow-x-auto whitespace-pre font-mono text-sm leading-7">{view.text}</pre>:view.text.split('\n').map((line,index)=>{
    if(!line.trim())return <div key={index} className="h-2"/>;
    if(/^\s*OR\s*$/i.test(line))return <div key={index} className="my-3 flex items-center gap-3 text-sm font-semibold text-slate-600"><span className="h-px flex-1 bg-slate-200"/>OR<span className="h-px flex-1 bg-slate-200"/></div>;
    const subpart=/^\s*\((?:[a-z]|[ivx]+)\)/i.test(line);
    return <p key={index} className={`whitespace-pre-wrap break-words ${subpart?'mt-2 pl-3':''}`}>{line}</p>;
   })}
  </div>
  {view.warnings.length>0&&<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><p className="font-semibold">Source review needed</p><ul className="mt-1 list-disc space-y-1 pl-5">{view.warnings.map(warning=><li key={warning}>{warning}</li>)}</ul></div>}
  <p className="text-xs text-slate-600">Source wording retained. Check equations, tables and diagrams against the linked PDF; missing symbols are not guessed.</p>
  <details className="text-xs text-slate-600"><summary className="cursor-pointer">Original extracted text{view.removed?' · page furniture hidden above':''}</summary><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded border p-3 font-mono">{text}</pre></details>
 </div>;
}
