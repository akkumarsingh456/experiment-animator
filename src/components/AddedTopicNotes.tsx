import {useEffect,useState} from 'react';
import {Trash2,Undo2} from 'lucide-react';
import {Button} from './ui/button';
import {MathText} from './MathText';
import {MathematicsProse} from './MathematicsProse';
import {isMathematics} from '@/lib/mathematics-presentation';

/** Only explicitly added supplement points are editable here, never source sections. */
export function AddedTopicNotes({lines,subject,onChange}:{lines:string[];subject:string;onChange:(lines:string[])=>void}){
 const [selected,setSelected]=useState<Set<string>>(()=>new Set()),[undo,setUndo]=useState<string[]>([]),[notice,setNotice]=useState('');
 useEffect(()=>{setSelected(current=>new Set([...current].filter(line=>lines.includes(line))));},[lines]);

 return <section className="space-y-3 border-t pt-4" aria-label="Manage added notes">
  <h3 className="font-bold text-sky-950">Remove added points · {lines.length} points</h3>
  <p className="text-sm text-slate-600">Tick the points you no longer need, then choose Delete selected. Undo is available while this window stays open. Original NCERT notes cannot be removed here.</p>
  {!lines.length&&<p role="status" className="text-sm">No added points to remove. Choose Add notes to add teaching points.</p>}
  {!!lines.length&&<>
   <div className="flex flex-wrap items-center gap-2">
    <Button size="sm" variant="outline" onClick={()=>setSelected(new Set(lines))}>Select all added points</Button>
    <Button size="sm" variant="ghost" disabled={!selected.size} onClick={()=>setSelected(new Set())}>Clear selection</Button>
    <span className="text-xs text-slate-600">{selected.size} selected</span>
   </div>
   <ol className="max-h-80 space-y-3 overflow-y-auto" aria-label="Added points available for deletion">{lines.map((line,index)=><li key={line}>
    <label className={`flex cursor-pointer items-start gap-3 rounded-md p-2 ${selected.has(line)?'bg-red-50':'hover:bg-slate-50'}`}>
     <input type="checkbox" checked={selected.has(line)} className="mt-1.5 h-4 w-4 shrink-0" aria-label={`Select added point ${index+1} for deletion`} onChange={()=>setSelected(current=>{const next=new Set(current);if(next.has(line))next.delete(line);else next.add(line);return next;})}/>
     <div className="min-w-0 text-sm leading-relaxed"><strong className="mr-1 text-sky-900">{index+1}.</strong>{isMathematics(subject)?<MathematicsProse text={line}/>:<MathText text={line} subject={subject}/>}</div>
    </label>
   </li>)}</ol>
   <Button size="sm" variant="outline" disabled={!selected.size} className="border-red-300 text-red-800 hover:bg-red-50" onClick={()=>{
    const remaining=lines.filter(line=>!selected.has(line));setUndo([...lines]);onChange(remaining);setNotice(`${selected.size} added point${selected.size===1?'':'s'} removed. Changes save automatically.`);setSelected(new Set());
   }}><Trash2 size={15} className="mr-2" aria-hidden="true"/>Delete selected ({selected.size})</Button>
  </>}
  {!!undo.length&&<Button size="sm" variant="outline" onClick={()=>{onChange([...new Set([...undo,...lines])]);setUndo([]);setNotice('Deleted points restored. Changes save automatically.');}}><Undo2 size={15} className="mr-2" aria-hidden="true"/>Undo deletion</Button>}
  {notice&&<p role="status" className="text-sm text-sky-900">{notice}</p>}
 </section>;
}
