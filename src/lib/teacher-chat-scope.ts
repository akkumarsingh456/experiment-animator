import {NCERT_SYLLABUS,subtopicsFor} from './ncert-syllabus';
import {isPhysicalChemistryChapter} from './physical-chemistry-revision';
import type {AttentionScope} from './attention-topic-scope';
const identity=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/^(?:class\s*|(?:chapter|unit)\s*\d+\s*[:.\-]?\s*)/,'').replace(/[^\p{L}\p{M}\p{N}]/gu,'');

/** Add notes chat only: a generated presentation title is not a new syllabus
 * topic. Validate its underlying topic/chapter without weakening source recovery. */
export function canonicalTeacherChatScope(input:AttentionScope):AttentionScope|undefined{
 const klass=input.klass.replace(/^Class\s*/i,'').trim();
 if(!['9','10','11','12'].includes(klass))return;
 const subject=Object.keys(NCERT_SYLLABUS[klass]||{}).find(value=>identity(value)===identity(input.subject));if(!subject)return;
 const row=NCERT_SYLLABUS[klass][subject].find(value=>identity(value.chapter)===identity(input.chapter));if(!row)return;
 // Only suffixes actually used by generated presentation/teacher slides.
 let title=input.topic.trim();
 for(let count=0;count<3;count++){
  const next=title.replace(/\s+[—–-]\s+(?:Formula reference|Page \d+|Teacher slide \d+)$/i,'').trim();
  if(next===title)break;title=next;
 }
 const topicKey=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[‐‑‒–—−]/g,'-').replace(/[^\p{L}\p{M}\p{N}=+*/^<>-]/gu,'');
 const topic=subtopicsFor(klass,subject,row.chapter).find(value=>topicKey(value)===topicKey(title));
 if(topic)return {klass,subject,chapter:row.chapter,topic};
 const chapterTitle=row.chapter.replace(/^(?:chapter|unit)\s*\d+\s*[:.\-]?\s*/i,'').trim();
 if(title==='Physical Chemistry — final revision'&&isPhysicalChemistryChapter(klass,subject,row.chapter))return {klass,subject,chapter:row.chapter,topic:chapterTitle};
 if(identity(title)===identity(chapterTitle))return {klass,subject,chapter:row.chapter,topic:chapterTitle};
 return;
}
