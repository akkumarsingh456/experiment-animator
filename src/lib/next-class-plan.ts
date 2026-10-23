import type {Slide} from './generate.functions';
import type {TeacherTeachingPlan} from './teacher-teaching-plan';

export const NEXT_CLASS_TITLE='Next Class Plan';
/** A view of the existing private teaching plan, never a second editable copy. */
export function nextClassPlanSlide(plan:TeacherTeachingPlan,scope:{klass:string;subject:string;chapter:string},lessonId:string):Slide|null{
 if(plan.nextClassSlide!=='visible'||!lessonId)return null;
 const field=(heading:string,value:string|undefined)=>({heading,kind:'bullets' as const,lines:value?.trim()?value.split('\n').map(line=>line.trim()).filter(Boolean):['To be added by the teacher']});
 return {title:NEXT_CLASS_TITLE,kind:'content',visual:'book',bullets:[],notes:[],key_terms:[],caption:'Teacher-prepared plan for the next class',
  teacher_next_class:{lessonId,chapter:scope.chapter,includeInPdf:plan.includeInPdf!==false},
  sections:[field('Class and subject',`Class ${scope.klass} · ${scope.subject}`),field('Next lesson date',plan.date),field('Chapter',plan.nextChapter||scope.chapter),field('Topics to teach',plan.nextTopics),field('Continue from',plan.continueFrom),field('Materials and preparation',plan.materials),field('Teacher reminder',plan.notes)]};
}
export const withoutNextClassPlan=(slides:Slide[])=>slides.filter(slide=>!slide.teacher_next_class);
export function withNextClassPlan(slides:Slide[],plan:Slide|null){return plan?[...withoutNextClassPlan(slides),plan]:withoutNextClassPlan(slides);}
export const nextClassPdfSlides=(slides:Slide[])=>slides.filter(slide=>!slide.teacher_next_class||slide.teacher_next_class.includeInPdf);
