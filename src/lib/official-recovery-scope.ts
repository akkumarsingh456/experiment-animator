import {NCERT_SYLLABUS,subtopicsFor} from './ncert-syllabus';
import {canonicalAttentionTopic,type AttentionScope} from './attention-topic-scope';
const key=(text:string)=>text.normalize('NFKC').toLowerCase().replace(/[‐‑‒–—−]/g,'-').replace(/^(?:class\s*|(?:chapter|unit)\s*\d+\s*[:.\-]?\s*)/,'').replace(/[^\p{L}\p{N}=+*/^<>-]/gu,'');
/** Only called after ordinary NCERT extraction/recovery fails. The user's
 * expanded permission covers failed catalogue topics, never arbitrary input. */
export function canonicalOfficialRecoveryTopic(input:AttentionScope):AttentionScope|undefined {
 const previous=canonicalAttentionTopic(input);if(previous)return previous;
 const klass=input.klass.replace(/^Class\s*/i,'').trim();
 if(!['9','10','11','12'].includes(klass))return;
 const subjects=Number(klass)<11?['Social Science','Science','Mathematics','Computer Science']:['Physics','Chemistry','Mathematics','Computer Science'];
 const subject=subjects.find(subject=>key(subject)===key(input.subject));if(!subject)return;
 const chapter=NCERT_SYLLABUS[klass]?.[subject]?.find(row=>key(row.chapter)===key(input.chapter))?.chapter;if(!chapter)return;
 const topic=subtopicsFor(klass,subject,chapter).find(topic=>key(topic)===key(input.topic));
 return topic?{klass,subject,chapter,topic}:undefined;
}
