import {useEffect,useMemo,useState} from 'react';
import {useNavigate} from '@tanstack/react-router';
import {listTeacherLessons,listTeacherTeachingPlans} from '@/lib/teacher-workspace.functions';
import {lectureActionSearch,type WorkspaceMeta} from '@/lib/teacher-workspace';
import {emptyTeachingFilters,filterTeachingLectures,groupTeachingLectures,teachingStatusLabels,teachingToday,upcomingTeachingLectures,type TeacherPlanRecord} from '@/lib/teacher-teaching-plan';
import {Button} from './ui/button';
import {TeacherPlanEditor} from './TeacherPlanEditor';

async function allLectures(){
  const items=new Map<string,WorkspaceMeta>();let offset=0;
  for(;;){const page=await listTeacherLessons({data:{offset}});for(const item of page.items)items.set(item.id,item);if(page.nextOffset===null)break;if(page.nextOffset<=offset)throw new Error('Older lecture history could not be loaded. Please refresh.');offset=page.nextOffset;}
  return [...items.values()];
}
export function TeacherLecturePlanner({ownerEmail,refreshKey}:{ownerEmail:string;refreshKey:number}){
  const navigate=useNavigate();
  const [items,setItems]=useState<WorkspaceMeta[]>([]),[plans,setPlans]=useState<Record<string,TeacherPlanRecord>>({});
  const [busy,setBusy]=useState(true),[error,setError]=useState(''),[planError,setPlanError]=useState('');
  const [filters,setFilters]=useState(emptyTeachingFilters);
  const [quickView,setQuickView]=useState('all'),[sort,setSort]=useState('recent'),[copyStatus,setCopyStatus]=useState('');
  const today=teachingToday();
  useEffect(()=>{let active=true;setBusy(true);setError('');setPlanError('');void(async()=>{
    const [lectures,planning]=await Promise.allSettled([allLectures(),listTeacherTeachingPlans()]);if(!active)return;
    if(lectures.status==='fulfilled')setItems(lectures.value);else setError(lectures.reason instanceof Error?lectures.reason.message:'Your lectures could not be loaded.');
    if(planning.status==='fulfilled')setPlans(Object.fromEntries(planning.value.map(record=>[record.lessonId,record])));else setPlanError('Teaching plans could not be loaded. Refresh before editing a plan; lecture actions are still available.');
    setBusy(false);
  })();return()=>{active=false;};},[ownerEmail,refreshKey]);
  const classes=useMemo(()=>[...new Set(items.map(item=>item.scope.klass))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),[items]);
  const subjects=useMemo(()=>[...new Set(items.filter(item=>!filters.klass||item.scope.klass===filters.klass).map(item=>item.scope.subject))].sort(),[items,filters.klass]);
  const chapters=useMemo(()=>[...new Set(items.filter(item=>(!filters.klass||item.scope.klass===filters.klass)&&(!filters.subject||item.scope.subject===filters.subject)).map(item=>item.scope.chapter).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),[items,filters.klass,filters.subject]);
  const filtered=useMemo(()=>filterTeachingLectures(items,plans,planError?{...filters,status:''}:filters).filter(item=>{
    if(planError||quickView==='all')return true;
    const plan=plans[item.id]?.plan;
    return quickView==='today'?plan?.date===today&&plan.status!=='taught':plan?.status===quickView;
  }).sort((a,b)=>{
    if(sort==='title')return a.title.localeCompare(b.title,undefined,{numeric:true});
    if(sort==='date')return (plans[a.id]?.plan.date||'9999').localeCompare(plans[b.id]?.plan.date||'9999')||b.savedAt.localeCompare(a.savedAt);
    return b.savedAt.localeCompare(a.savedAt);
  }),[items,plans,filters,planError,quickView,sort,today]),groups=groupTeachingLectures(filtered);
  const upcoming=upcomingTeachingLectures(filtered,plans).slice(0,3);
  async function copyPlan(){
    const text=['My teaching plan',...filtered.map(item=>{
      const plan=plans[item.id]?.plan;
      return [`Class ${item.scope.klass} · ${item.scope.subject}`,item.title,`Prepared topics: ${item.scope.subtopics||item.scope.topic}`,
        plan?`Status: ${teachingStatusLabels[plan.status]}`:'Status: Not planned',plan?.date?`Teaching date: ${plan.date}`:'',plan?.nextTopics?`Teach next: ${plan.nextTopics}`:'',plan?.notes?`Reminders: ${plan.notes}`:''].filter(Boolean).join('\n');
    })].join('\n\n');
    try{await navigator.clipboard.writeText(text);setCopyStatus('Teaching plan copied. Paste it into your diary or lesson planner.');}
    catch{setCopyStatus('Copy was unavailable. Please allow clipboard access and try again.');}
  }
  const counts=(status:string)=>filtered.filter(item=>plans[item.id]?.plan.status===status).length;
  const control='mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm';
  return <section aria-label="Lecture library and teaching plans" className="space-y-5">
    <div><h2 className="text-xl font-semibold">Your lecture library</h2><p className="mt-2 text-sm text-slate-600">Find a prepared lecture, present it, or plan what to teach next.</p></div>
    {error&&<p role="alert" className="text-destructive">{error}</p>}{planError&&<p role="alert" className="text-amber-800">{planError}</p>}
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white/80 p-3" aria-label="Quick lecture views">
      {([['all','All lectures'],['today',"Today's teaching"],['teaching','In progress'],['revise','Needs revision']] as const).map(([value,label])=><Button key={value} size="sm" variant={quickView===value?'default':'outline'} aria-pressed={quickView===value} disabled={busy||!!planError&&value!=='all'} onClick={()=>{setQuickView(value);setFilters(current=>({...current,status:''}));setCopyStatus('');}}>{label}</Button>)}
      <label className="ml-auto text-sm">Sort lectures <select aria-label="Sort lectures" className="ml-2 rounded-lg border bg-white p-2" value={sort} onChange={event=>setSort(event.target.value)}><option value="recent">Recently saved</option><option value="title">Chapter name</option><option value="date" disabled={!!planError}>Teaching date</option></select></label>
      <Button size="sm" variant="outline" disabled={busy||!!error||!!planError||!filtered.length} onClick={copyPlan}>Copy teaching plan</Button>
    </div>
    <p className="text-xs text-slate-500">Quick views and search work together. Copy includes the matching lectures only.</p>
    {copyStatus&&<p role="status" className="text-sm text-slate-600">{copyStatus}</p>}
    <div className="rounded-xl border bg-white p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm font-medium">Class<select aria-label="Filter class" className={control} value={filters.klass} onChange={event=>setFilters(current=>({...current,klass:event.target.value,subject:'',chapter:''}))}><option value="">All classes</option>{classes.map(value=><option key={value} value={value}>Class {value}</option>)}</select></label>
      <label className="text-sm font-medium">Subject<select aria-label="Filter subject" className={control} value={filters.subject} onChange={event=>setFilters(current=>({...current,subject:event.target.value,chapter:''}))}><option value="">All subjects</option>{subjects.map(value=><option key={value}>{value}</option>)}</select></label>
      <label className="text-sm font-medium">Chapter<select aria-label="Filter chapter" className={control} value={filters.chapter} onChange={event=>setFilters(current=>({...current,chapter:event.target.value}))}><option value="">All chapters</option>{chapters.map(value=><option key={value}>{value}</option>)}</select></label>
      <label className="text-sm font-medium">Teaching status<select aria-label="Filter teaching status" className={control} disabled={!!planError} value={filters.status} onChange={event=>setFilters(current=>({...current,status:event.target.value}))}><option value="">All statuses</option>{Object.entries(teachingStatusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    </div><div className="mt-3 flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm font-medium">Find a lecture or teaching note<input aria-label="Search lectures and teaching notes" type="search" className={control} placeholder="Search chapter, topic, next lesson or reminder…" value={filters.query} onChange={event=>setFilters(current=>({...current,query:event.target.value}))}/></label><Button variant="outline" onClick={()=>{setFilters(emptyTeachingFilters());setQuickView('all');setCopyStatus('');}}>Clear filters</Button></div></div>
    {busy&&<p role="status">Loading your complete lecture catalogue and teaching plans…</p>}
    {!busy&&<div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Lecture overview">{[[filtered.length,'Matching lectures'],...(!planError?[[counts('planned'),'To teach'],[counts('teaching'),'In progress'],[counts('taught'),'Taught']]:[])].map(([number,label])=><div key={label} className="rounded-xl border bg-white/80 px-4 py-3"><span className="block text-xl font-semibold text-slate-900">{number}</span><span className="text-xs text-slate-500">{label}</span></div>)}</div>}
    {!planError&&!!upcoming.length&&<aside className="rounded-xl border border-sky-200 bg-sky-50 p-4" aria-label="Teaching next"><h3 className="mb-3 font-semibold">Teaching next</h3><div className="grid gap-3 md:grid-cols-3">{upcoming.map(item=>{const plan=plans[item.id].plan;return <div key={item.id} className="rounded-lg border bg-white p-3"><p className="text-xs font-semibold text-sky-800">{plan.date===today?'Today':plan.date<today?'Past planned date':'Upcoming'} · {plan.date}</p><p className="mt-1 text-xs text-slate-600">Class {item.scope.klass} · {item.scope.subject}</p><p className="my-1 font-medium">{item.title}</p><p className="mb-2 whitespace-pre-wrap break-words text-sm">{plan.nextTopics||item.scope.topic}</p><Button size="sm" variant="outline" onClick={()=>navigate({to:'/generate',search:lectureActionSearch(item,'open')})}>Open lecture</Button></div>;})}</div></aside>}
    {!busy&&!items.length&&!error&&<p>No cloud lessons saved yet. Prepare a lecture while signed in to start your history.</p>}
    {!busy&&!!items.length&&!filtered.length&&<p>No lectures match these filters. Clear filters to see your saved lectures.</p>}
    <div className={groups.length===1?'grid gap-5':'grid items-start gap-5 xl:grid-cols-2'}>{groups.map(group=><section className="rounded-2xl border bg-slate-50/70 p-3 sm:p-4" key={JSON.stringify([group.klass,group.subject])} aria-label={`Class ${group.klass} ${group.subject} lectures`}><h3 className="mb-3 flex flex-wrap items-center gap-2 text-lg font-semibold">Class {group.klass}<span className="text-slate-400">/</span>{group.subject}<span className="text-sm font-normal text-slate-500">{group.items.length} {group.items.length===1?'lecture':'lectures'}</span></h3><div className={groups.length===1&&group.items.length>1?'grid gap-3 xl:grid-cols-2':'grid gap-3'}>{group.items.map(item=>{const record=plans[item.id];return <article key={item.id} className="min-w-0 rounded-xl border bg-white p-4"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-900">{planError?'Plan unavailable':teachingStatusLabels[record?.plan.status||'unplanned']}</span>{record?.plan.date&&<span className="text-xs text-slate-600">Teach: {record.plan.date}</span>}</div><h4 className="text-base font-semibold sm:text-lg">{item.title}</h4><p className="my-2 text-sm text-slate-600">Class {item.scope.klass} · {item.scope.subject} · {item.slides} slides</p><p className="mb-2 whitespace-pre-wrap break-words text-sm"><strong>Prepared topics:</strong> {item.scope.subtopics||item.scope.topic}</p>{record?.plan.nextTopics&&<p className="mb-2 whitespace-pre-wrap break-words text-sm"><strong>Teach next:</strong> {record.plan.nextTopics}</p>}{record?.plan.notes&&<p className="mb-2 line-clamp-2 whitespace-pre-wrap break-words text-sm text-slate-600" title={record.plan.notes}><strong>Reminder:</strong> {record.plan.notes}</p>}<p className="mb-3 text-xs text-slate-500">Lecture saved {new Date(item.savedAt).toLocaleString()}</p><div className="flex flex-wrap gap-2"><Button size="sm" onClick={()=>navigate({to:'/generate',search:lectureActionSearch(item,'open')})}>Open saved lesson</Button><Button size="sm" variant="outline" onClick={()=>navigate({to:'/generate',search:lectureActionSearch(item,'present')})}>Present</Button><Button size="sm" variant="outline" onClick={()=>navigate({to:'/generate',search:lectureActionSearch(item,'pdf')})}>Download PDF</Button></div>{!planError&&!busy&&<TeacherPlanEditor ownerEmail={ownerEmail} lessonId={item.id} record={record} topicHint={item.scope.subtopics||item.scope.topic} onSaved={saved=>setPlans(current=>({...current,[saved.lessonId]:saved}))}/>}</article>;})}</div></section>)}</div>
  </section>;
}
