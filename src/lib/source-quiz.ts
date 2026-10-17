import type { Mcq } from '@/lib/generate.functions';
import { cleanSourceNoteLine, hasBrokenSourceMath, validStudyTerm } from '@/lib/source-note-quality';
import { cleanSocialNoteText } from '@/lib/social-note-presentation';

/** Source comprehension only. Never manufacture questions to fill a quota. */
export function sourceQuizItems(sentences:string[],subject:string,count=10):Mcq[]{
 const definitions=new Map<string,{term:string;verb:string;meaning:string;evidence:string}>();
 for(const original of sentences){
  const line=cleanSourceNoteLine(subject==='Social Science'?cleanSocialNoteText(original):original).replace(/^\*\*[^*]+:\*\*\s*/, '').trim();
  if(line.length<35||line.length>260||/[?\uE000-\uF8FF]/u.test(line)||hasBrokenSourceMath(line)||/\b(?:reprint|edition|copyright|exercise|printed|fig(?:ure)?\s*\d|page\s+\d|20\d{2}\s*[-–]\s*\d{2})\b/i.test(line))continue;
  const match=line.match(/^([A-Z][\p{L}\p{M}'’ -]{2,55}?)\s+(is defined as|is known as|is called|refers to|means|is|are)\s+(.{18,200})[.!]?$/u);
  if(!match)continue;
  const [,term,verb,meaning]=match;
  if(!validStudyTerm(term,meaning)||term.split(/\s+/).length>7||/^(?:this|that|it|they|there|we|you|which|what|who|why|how|one|the following)\b/i.test(term))continue;
  definitions.set(term.toLowerCase(),{term,verb,meaning,evidence:line});
 }
 const entries=[...definitions.values()],items:Mcq[]=[];
 for(const [index,entry]of entries.entries()){
  const distractors=entries.filter(other=>other.term.toLowerCase()!==entry.term.toLowerCase()&&!entry.meaning.toLowerCase().includes(other.term.toLowerCase())&&other.meaning.toLowerCase()!==entry.meaning.toLowerCase()).slice(0,3);
  if(!distractors.length)continue;
  const answerIndex=index%(distractors.length+1),terms=distractors.map(other=>other.term);terms.splice(answerIndex,0,entry.term);
  const keys=['A','B','C','D'] as const;
  items.push({question:`Complete the source statement: _____ ${entry.verb} ${entry.meaning}`,options:terms.map((text,i)=>({key:keys[i],text})),answer:keys[answerIndex],explanation:entry.evidence});
  if(items.length>=count)break;
 }
 return items;
}
