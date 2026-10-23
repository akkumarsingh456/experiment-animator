import {useEffect,useRef,useState} from 'react';
import {Button} from './ui/button';
import {saveTeacherTeachingPlan} from '@/lib/teacher-workspace.functions';
import {emptyTeachingPlan,teacherPlanDraftKey,teacherPlanDraftSchema,teacherTeachingPlanSchema,teachingStatusLabels,type TeacherTeachingPlan,type TeacherPlanRecord} from '@/lib/teacher-teaching-plan';

type Props={lessonId:string;ownerEmail:string;record?:TeacherPlanRecord;topicHint:string;onSaved:(record:TeacherPlanRecord)=>void;value?:TeacherTeachingPlan;onDraftChange?:(plan:TeacherTeachingPlan)=>void;forceOpen?:boolean};
export function TeacherPlanEditor({lessonId,ownerEmail,record,topicHint,onSaved,value,onDraftChange,forceOpen=false}:Props){
  const key=teacherPlanDraftKey(ownerEmail,lessonId);
  const [initial]=useState(()=>{try{const raw=localStorage.getItem(key),draft=raw?teacherPlanDraftSchema.parse(JSON.parse(raw)):null;return {draft:draft&&JSON.stringify(draft.plan)!==JSON.stringify(record?.plan)?draft:null,warning:''};}catch{return {draft:null,warning:'Device drafts are unavailable. Save your plan before leaving this page.'};}});
  const [plan,setPlan]=useState<TeacherTeachingPlan>(value||initial.draft?.plan||record?.plan||emptyTeachingPlan());
  const [status,setStatus]=useState(initial.draft?'Device draft restored. Review it and save your teaching plan.':initial.warning);
  const [dirty,setDirty]=useState(!!initial.draft),[saving,setSaving]=useState(false);
  const [expanded,setExpanded]=useState(!!initial.draft);
  const latest=useRef(plan);latest.current=plan;
  const changes=useRef(0),baseRevision=useRef(record?.revision||'');
  useEffect(()=>{if(!value)return;if(JSON.stringify(value)!==JSON.stringify(latest.current)){latest.current=value;setPlan(value);changes.current++;}setDirty(JSON.stringify(value)!==JSON.stringify(record?.plan||emptyTeachingPlan()));},[value,record?.revision]);
  useEffect(()=>{baseRevision.current=record?.revision||'';if(!value&&!dirty){const next=record?.plan||emptyTeachingPlan();latest.current=next;setPlan(next);}else if(dirty&&initial.draft&&initial.draft.baseRevision!==(record?.revision||'')&&JSON.stringify(latest.current)!==JSON.stringify(record?.plan))setStatus('The cloud plan changed. Your device draft is kept; review it before saving.');},[record?.revision]);
  function change(patch:Partial<TeacherTeachingPlan>){
    const value={...latest.current,...patch};latest.current=value;changes.current++;setPlan(value);setDirty(true);onDraftChange?.(value);
    try{localStorage.setItem(key,JSON.stringify({plan:value,baseRevision:baseRevision.current}));setStatus('Draft kept on this device · not saved to cloud yet.');}catch{setStatus('Device saving failed. Keep this page open and save the plan to cloud.');}
  }
  async function save(){
    const parsed=teacherTeachingPlanSchema.safeParse(latest.current);if(!parsed.success){setStatus(parsed.error.issues[0]?.message||'Please check your teaching plan.');return;}
    const version=changes.current;setSaving(true);setStatus('Saving teaching plan…');
    try{
      const saved=await saveTeacherTeachingPlan({data:{id:lessonId,plan:parsed.data,expectedRevision:baseRevision.current,expectedEmail:ownerEmail}});baseRevision.current=saved.revision;
      if(changes.current===version){setDirty(false);try{localStorage.removeItem(key);}catch{}setStatus('Teaching plan saved to your private workspace.');}
      else{try{localStorage.setItem(key,JSON.stringify({plan:latest.current,baseRevision:saved.revision}));}catch{}setStatus('Previous version saved. Newer edits still need saving.');}
      onSaved(saved);
    }catch(error){setStatus(`Saving failed · ${error instanceof Error?error.message:'Your lecture notes are unchanged. Retry saving.'}`);}
    finally{setSaving(false);}
  }
  return <details className="mt-4 border-t pt-3" open={forceOpen||expanded} onToggle={event=>setExpanded(event.currentTarget.open)}>
    <summary className="cursor-pointer text-sm font-semibold text-sky-800">Plan my teaching <span className="ml-2 font-normal text-slate-600">{teachingStatusLabels[plan.status]}{plan.date?` · ${plan.date}`:''}{dirty?' · Unsaved draft':''}</span></summary>
    <div className="mt-3 grid gap-3 text-sm">
      <p className="text-slate-600">Saved privately with this lecture. Enabling the Next Class Plan slide shows these fields in the presentation and optionally the PDF. Existing lecture notes are unchanged.</p>
      <div className="grid gap-3 sm:grid-cols-2"><label>Teaching status<select aria-label="Teaching status" className="mt-1 w-full rounded-lg border bg-white p-2" value={plan.status} onChange={event=>change({status:event.target.value as TeacherTeachingPlan['status']})}>{Object.entries(teachingStatusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Planned teaching date<input aria-label="Planned teaching date" className="mt-1 w-full rounded-lg border bg-white p-2" type="date" value={plan.date} onChange={event=>change({date:event.target.value})}/></label></div>
      <label>Next topics to teach<textarea aria-label="Next topics to teach" rows={3} maxLength={2000} className="mt-1 w-full rounded-lg border bg-white p-2" placeholder={`For example: the next part of ${topicHint}`} value={plan.nextTopics} onChange={event=>change({nextTopics:event.target.value})}/></label>
      <label>Next chapter<input aria-label="Next chapter" maxLength={500} className="mt-1 w-full rounded-lg border bg-white p-2" placeholder="Leave empty to continue the current chapter" value={plan.nextChapter||''} onChange={event=>change({nextChapter:event.target.value})}/></label>
      <label>Where to continue from<textarea aria-label="Where to continue from" rows={2} maxLength={1500} className="mt-1 w-full rounded-lg border bg-white p-2" placeholder="Example number, page, activity or unfinished explanation…" value={plan.continueFrom||''} onChange={event=>change({continueFrom:event.target.value})}/></label>
      <label>Materials and preparation<textarea aria-label="Materials and preparation" rows={2} maxLength={1500} className="mt-1 w-full rounded-lg border bg-white p-2" value={plan.materials||''} onChange={event=>change({materials:event.target.value})}/></label>
      <label>Teaching reminders<textarea aria-label="Teaching reminders" rows={3} maxLength={4000} className="mt-1 w-full rounded-lg border bg-white p-2" placeholder="Examples to explain, materials to bring, or where to continue next lesson…" value={plan.notes} onChange={event=>change({notes:event.target.value})}/></label>
      <div className="rounded-lg border bg-sky-50 p-3"><p className="font-semibold">Next Class Plan · final slide</p><div className="mt-2 flex flex-wrap gap-2">{!plan.nextClassSlide||plan.nextClassSlide==='off'?<Button size="sm" variant="outline" onClick={()=>change({nextClassSlide:'visible',includeInPdf:plan.includeInPdf!==false})}>Add Next Class Plan slide</Button>:<><Button size="sm" variant="outline" onClick={()=>change({nextClassSlide:plan.nextClassSlide==='visible'?'hidden':'visible'})}>{plan.nextClassSlide==='visible'?'Hide plan slide':'Show plan slide'}</Button><Button size="sm" variant="outline" onClick={()=>change({nextClassSlide:'off'})}>Delete plan slide only</Button></>}</div>{plan.nextClassSlide&&plan.nextClassSlide!=='off'&&<label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={plan.includeInPdf!==false} onChange={event=>change({includeInPdf:event.target.checked})}/>Include as the final PDF page</label>}<p className="mt-2 text-xs text-slate-600">Hide or delete affects only this added slide. Planning fields are kept. Keep the plan concise for presentation.</p></div>
      <div className="flex flex-wrap items-center gap-2"><Button size="sm" disabled={saving||!dirty} onClick={save}>{saving?'Saving…':'Save teaching plan'}</Button>{record&&<span className="text-xs text-slate-500">Cloud plan updated {new Date(record.updatedAt).toLocaleString()}</span>}</div>
      {status&&<p role="status" className="text-xs text-slate-600">{status}</p>}
    </div>
  </details>;
}
