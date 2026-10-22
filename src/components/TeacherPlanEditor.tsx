import {useEffect,useRef,useState} from 'react';
import {Button} from './ui/button';
import {saveTeacherTeachingPlan} from '@/lib/teacher-workspace.functions';
import {emptyTeachingPlan,teacherPlanDraftKey,teacherPlanDraftSchema,teacherTeachingPlanSchema,teachingStatusLabels,type TeacherTeachingPlan,type TeacherPlanRecord} from '@/lib/teacher-teaching-plan';

type Props={lessonId:string;ownerEmail:string;record?:TeacherPlanRecord;topicHint:string;onSaved:(record:TeacherPlanRecord)=>void};
export function TeacherPlanEditor({lessonId,ownerEmail,record,topicHint,onSaved}:Props){
  const key=teacherPlanDraftKey(ownerEmail,lessonId);
  const [initial]=useState(()=>{try{const raw=localStorage.getItem(key),draft=raw?teacherPlanDraftSchema.parse(JSON.parse(raw)):null;return {draft:draft&&JSON.stringify(draft.plan)!==JSON.stringify(record?.plan)?draft:null,warning:''};}catch{return {draft:null,warning:'Device drafts are unavailable. Save your plan before leaving this page.'};}});
  const [plan,setPlan]=useState<TeacherTeachingPlan>(initial.draft?.plan||record?.plan||emptyTeachingPlan());
  const [status,setStatus]=useState(initial.draft?'Device draft restored. Review it and save your teaching plan.':initial.warning);
  const [dirty,setDirty]=useState(!!initial.draft),[saving,setSaving]=useState(false);
  const [expanded,setExpanded]=useState(!!initial.draft);
  const latest=useRef(plan);latest.current=plan;
  const changes=useRef(0),baseRevision=useRef(record?.revision||'');
  useEffect(()=>{baseRevision.current=record?.revision||'';if(!dirty){const value=record?.plan||emptyTeachingPlan();latest.current=value;setPlan(value);}else if(initial.draft&&initial.draft.baseRevision!==(record?.revision||''))setStatus('The cloud plan changed. Your device draft is kept; review it before saving.');},[record?.revision]);
  function change(patch:Partial<TeacherTeachingPlan>){
    const value={...latest.current,...patch};latest.current=value;changes.current++;setPlan(value);setDirty(true);
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
    }catch(error){setStatus(error instanceof Error?error.message:'Plan saving failed. Your lecture notes are unchanged.');}
    finally{setSaving(false);}
  }
  return <details className="mt-4 border-t pt-3" open={expanded} onToggle={event=>setExpanded(event.currentTarget.open)}>
    <summary className="cursor-pointer text-sm font-semibold text-sky-800">Plan my teaching <span className="ml-2 font-normal text-slate-600">{teachingStatusLabels[plan.status]}{plan.date?` · ${plan.date}`:''}{dirty?' · Unsaved draft':''}</span></summary>
    <div className="mt-3 grid gap-3 text-sm">
      <p className="text-slate-600">Private planning only. This does not change the lecture notes.</p>
      <div className="grid gap-3 sm:grid-cols-2"><label>Teaching status<select aria-label="Teaching status" className="mt-1 w-full rounded-lg border bg-white p-2" value={plan.status} onChange={event=>change({status:event.target.value as TeacherTeachingPlan['status']})}>{Object.entries(teachingStatusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Planned teaching date<input aria-label="Planned teaching date" className="mt-1 w-full rounded-lg border bg-white p-2" type="date" value={plan.date} onChange={event=>change({date:event.target.value})}/></label></div>
      <label>Next topics to teach<textarea aria-label="Next topics to teach" rows={3} maxLength={2000} className="mt-1 w-full rounded-lg border bg-white p-2" placeholder={`For example: the next part of ${topicHint}`} value={plan.nextTopics} onChange={event=>change({nextTopics:event.target.value})}/></label>
      <label>Teaching reminders<textarea aria-label="Teaching reminders" rows={3} maxLength={4000} className="mt-1 w-full rounded-lg border bg-white p-2" placeholder="Examples to explain, materials to bring, or where to continue next lesson…" value={plan.notes} onChange={event=>change({notes:event.target.value})}/></label>
      <div className="flex flex-wrap items-center gap-2"><Button size="sm" disabled={saving||!dirty} onClick={save}>{saving?'Saving…':'Save teaching plan'}</Button>{record&&<span className="text-xs text-slate-500">Cloud plan updated {new Date(record.updatedAt).toLocaleString()}</span>}</div>
      {status&&<p role="status" className="text-xs text-slate-600">{status}</p>}
    </div>
  </details>;
}
