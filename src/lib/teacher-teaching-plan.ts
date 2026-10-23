import {z} from 'zod';
import type {WorkspaceMeta} from './teacher-workspace';
export const teachingStatusLabels={unplanned:'Not planned',planned:'To teach',teaching:'In progress',taught:'Taught',revise:'Needs revision'} as const;
export const teacherTeachingPlanSchema=z.object({
  status:z.enum(['unplanned','planned','teaching','taught','revise']),
  date:z.string().refine(value=>!value||/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value,'Choose a valid teaching date.'),
  nextTopics:z.string().max(2000),notes:z.string().max(4000),
  nextChapter:z.string().max(500).optional(),continueFrom:z.string().max(1500).optional(),materials:z.string().max(1500).optional(),
  nextClassSlide:z.enum(['off','visible','hidden']).optional(),includeInPdf:z.boolean().optional(),
}).strict();
export type TeacherTeachingPlan=z.infer<typeof teacherTeachingPlanSchema>;
export const teacherPlanRecordSchema=z.object({lessonId:z.string().uuid(),revision:z.string().uuid(),updatedAt:z.string().datetime(),plan:teacherTeachingPlanSchema}).strict();
export type TeacherPlanRecord=z.infer<typeof teacherPlanRecordSchema>;
export const emptyTeachingPlan=():TeacherTeachingPlan=>({status:'unplanned',date:'',nextTopics:'',notes:''});
export const teacherPlanDraftSchema=z.object({plan:teacherTeachingPlanSchema,baseRevision:z.union([z.string().uuid(),z.literal('')])});
export const teacherPlanDraftKey=(owner:string,id:string)=>'eduplan-teaching-plan-draft-v1:'+JSON.stringify([owner.toLowerCase(),id]);
export type TeachingFilters={klass:string;subject:string;chapter:string;status:string;query:string};
export const emptyTeachingFilters=():TeachingFilters=>({klass:'',subject:'',chapter:'',status:'',query:''});
export function filterTeachingLectures(items:WorkspaceMeta[],plans:Record<string,TeacherPlanRecord>,filters:TeachingFilters){
  const words=filters.query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.filter(item=>{
    const plan=plans[item.id]?.plan||emptyTeachingPlan();
    const haystack=[item.title,item.scope.klass,item.scope.subject,item.scope.chapter,item.scope.topic,item.scope.subtopics,plan.nextChapter,plan.nextTopics,plan.continueFrom,plan.materials,plan.notes].join(' ').toLowerCase();
    return (!filters.klass||item.scope.klass===filters.klass)&&(!filters.subject||item.scope.subject===filters.subject)&&(!filters.chapter||item.scope.chapter===filters.chapter)&&(!filters.status||plan.status===filters.status)&&words.every(word=>haystack.includes(word));
  });
}
export function groupTeachingLectures(items:WorkspaceMeta[]){
  const groups=new Map<string,{klass:string;subject:string;items:WorkspaceMeta[]}>();
  for(const item of items){const key=JSON.stringify([item.scope.klass,item.scope.subject]);const group=groups.get(key)||{klass:item.scope.klass,subject:item.scope.subject,items:[]};group.items.push(item);groups.set(key,group);}
  return [...groups.values()].sort((a,b)=>a.klass.localeCompare(b.klass,undefined,{numeric:true})||a.subject.localeCompare(b.subject));
}
/** Calendar comparisons use the teacher's local date, not a UTC midnight offset. */
export function teachingToday(){const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
export function upcomingTeachingLectures(items:WorkspaceMeta[],plans:Record<string,TeacherPlanRecord>){
  return items.filter(item=>{const plan=plans[item.id]?.plan;return !!plan?.date&&plan.status!=='taught';}).sort((a,b)=>plans[a.id].plan.date.localeCompare(plans[b.id].plan.date));
}
