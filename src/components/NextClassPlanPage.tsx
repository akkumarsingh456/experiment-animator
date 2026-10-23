import type {Slide} from '@/lib/generate.functions';
import {ManualVisualEditor} from './ManualVisualEditor';

/** One final teacher-plan article, isolated from NCERT lesson organisation. */
export function NextClassPlanPage({slide,klass='',subject=''}:{slide:Slide;klass?:string;subject?:string}){
 const info=slide.teacher_next_class!;
 return <article className="guided-topic next-class-plan-page bg-white p-6 text-slate-800" data-next-class-plan="true">
  <p className="text-sm text-sky-800">Class {klass} · {subject} · Teacher-prepared</p>
  <h2 className="mb-5 text-2xl font-bold text-sky-950">{slide.title}</h2>
  <div className="next-class-plan-grid">
   <div>{slide.sections?.map(section=><section className="mb-4 rounded-lg border border-sky-100 bg-sky-50/50 p-3" key={section.heading}>
    <h3 className="mb-1 font-semibold text-sky-900">{section.heading}</h3>
    {section.lines.map((line,index)=><p key={index} className="whitespace-pre-wrap break-words">{line}</p>)}
   </section>)}</div>
   <div className="h-72 min-h-0 rounded-xl border bg-white p-2">
    <ManualVisualEditor privateOnly autoSaveDevice klass={klass} subject={subject} chapter={info.chapter} topic={slide.title} slideId="next-class-plan" sharedSlideId={`next-class-plan:${info.lessonId}`} storageKey={`next-class-plan:${info.lessonId}`} autoUrl="" autoContent={<div className="p-4 text-sky-900"><h3 className="font-semibold">Ready for our next class</h3><p className="mt-3">Review the topics, continuation point and materials listed alongside.</p></div>} alt="Next class teaching plan illustration"/>
   </div>
  </div>
  <footer className="mt-4 text-xs text-slate-500">Next Class Plan · Teacher-prepared</footer>
 </article>;
}
