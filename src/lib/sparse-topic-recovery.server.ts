import {adequateTopicEvidence,recoverTopicFromSources} from './topic-source-recovery';
import {buildLocalSections} from './ncert-teacher-notes';
import type {Slide} from './generate.functions';
import {trustedChapterSource} from './trusted-chapter-source.server';
import {sourceUnavailable} from './secondary-study-evidence';

export async function recoverSparseTopicNotes(slides:Slide[],options:{klass:string;subject:string;chapter:string;sources:string[]}){
 const output:Slide[]=[],extraEvidence:string[]=[];
 for(const slide of slides){
  const facts=(slide.sections||[]).filter(section=>section.kind!=='diagram'&&!/activity|practice|revision|^Source (?:review|table)/i.test(section.heading)).flatMap(section=>section.lines);
  if(slide.teacher_pdf||!['content','chapter'].includes(slide.kind||'content')||adequateTopicEvidence(slide.title,facts)){output.push(slide);continue;}
  let recovery=recoverTopicFromSources(slide.title,options.sources),sourceUrl='';
  if(!recovery.complete){
   const trusted=await trustedChapterSource(options.klass,options.subject,options.chapter);
   if(trusted){const remote=recoverTopicFromSources(slide.title,[trusted.text]);if(remote.complete){recovery=remote;sourceUrl=trusted.url;}}
  }
  if(!recovery.complete)throw new Error(`Study notes for “${slide.title}” remain incomplete after three NCERT recovery strategies and an authoritative chapter-source check. The lesson was not saved with an empty topic. Add clearer matching Class ${options.klass} ${options.subject} chapter pages and retry.`);
  const grounding=recovery.lines.join('\n');extraEvidence.push(grounding);
  const updated={...slide,bullets:slide.bullets.filter(line=>!sourceUnavailable(line)),notes:slide.notes.filter(line=>!sourceUnavailable(line)),grounding};
  const rebuilt=buildLocalSections(updated);
  const known=new Set(rebuilt.flatMap(section=>section.lines));
  const retained=(slide.sections||[]).map(section=>({...section,lines:section.lines.filter(line=>!sourceUnavailable(line)&&!known.has(line))})).filter(section=>section.lines.length);
  output.push({...updated,sections:[...rebuilt,...retained],source_recovery:{attempts:recovery.attempts,kind:sourceUrl?'official-ncert-mirror':'uploaded-ncert',url:sourceUrl||undefined},caption:sourceUrl?'NCERT mirror recovery · IIT Kanpur SATHEE':slide.caption});
 }
 return {slides:output,extraEvidence};
}
