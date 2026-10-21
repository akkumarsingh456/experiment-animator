import {adequateTopicEvidence,recoverTopicFromSources} from './topic-source-recovery';
import {buildLocalSections} from './ncert-teacher-notes';
import type {Slide} from './generate.functions';
import {trustedChapterSource} from './trusted-chapter-source.server';
import {sourceUnavailable} from './secondary-study-evidence';
import {recoverAttentionTopic,attentionFailureMessage} from './attention-topic-notes.server';
import {verifiedNcertRecovery} from './verified-ncert-recovery';
import {canonicalOfficialRecoveryTopic} from './official-recovery-scope';

export function topicSourceComplete(slide:Slide,verbatim=false){
 if(slide.teacher_pdf||!['content','chapter'].includes(slide.kind||'content'))return true;
 // A genuine short source passage or poem is not an incomplete explanatory
 // topic. Do not manufacture paragraphs to meet a science-note length target.
 if(verbatim){const text=slide.chapter_text?.trim()||'';return !sourceUnavailable(text)&&(text.match(/[\p{L}\p{M}]+/gu)||[]).length>=3;}
 return adequateTopicEvidence(slide.title,(slide.sections||[]).filter(section=>section.kind!=='diagram'&&!/activity|practice|revision|^Source (?:review|table)/i.test(section.heading)).flatMap(section=>section.lines));
}
export async function recoverSparseTopicNotes(slides:Slide[],options:{klass:string;subject:string;chapter:string;sources:string[];verbatim?:boolean}){
 const output:Slide[]=[],extraEvidence:string[]=[];
 for(const slide of slides){
  if(topicSourceComplete(slide,options.verbatim)){output.push(slide);continue;}
  let recovery=recoverTopicFromSources(slide.title,options.sources),sourceUrl='';
  if(!recovery.complete){
   const snapshot=verifiedNcertRecovery(options.klass,options.subject,options.chapter,slide.title);
   if(snapshot){const recovered=recoverTopicFromSources(slide.title,[snapshot.text]);if(recovered.complete){recovery=recovered;sourceUrl=snapshot.url;}}
  }
  if(!recovery.complete){
   const trusted=await trustedChapterSource(options.klass,options.subject,options.chapter);
   if(trusted){const remote=recoverTopicFromSources(slide.title,[trusted.text]);if(remote.complete){recovery=remote;sourceUrl=trusted.url;}}
  }
  // Official supplementation is tried only after existing NCERT recovery
  // fails, for the exact configured class, subject, chapter and topic.
  const attention=!recovery.complete&&!options.verbatim?await recoverAttentionTopic({...options,topic:slide.title}):null;
  if(!recovery.complete&&!attention){
   if(!options.verbatim&&canonicalOfficialRecoveryTopic({...options,topic:slide.title}))throw new Error(attentionFailureMessage(slide.title));
   throw new Error(`Study notes for “${slide.title}” remain incomplete after three NCERT recovery strategies and an authoritative chapter-source check. The lesson was not saved with an empty topic. Add clearer matching Class ${options.klass} ${options.subject} chapter pages and retry.`);
  }
  if(attention)sourceUrl=attention.sources[0]?.url||'';
  const grounding=attention?.grounding||recovery.lines.join('\n');extraEvidence.push(grounding);
  if(options.verbatim){output.push({...slide,chapter_text:grounding,grounding,source_recovery:{attempts:recovery.attempts,kind:sourceUrl?'official-ncert-mirror':'uploaded-ncert',url:sourceUrl||undefined}});continue;}
  const updated={...slide,bullets:slide.bullets.filter(line=>!sourceUnavailable(line)),notes:slide.notes.filter(line=>!sourceUnavailable(line)),grounding};
  const rebuilt=attention?.sections||buildLocalSections(updated);
  const known=new Set(rebuilt.flatMap(section=>section.lines));
  const retained=(slide.sections||[]).map(section=>({...section,lines:section.lines.filter(line=>!sourceUnavailable(line)&&!known.has(line))})).filter(section=>section.lines.length);
  output.push({...updated,sections:[...rebuilt,...retained],source_recovery:{attempts:recovery.attempts,kind:attention?'official-online-supplement':sourceUrl?'official-ncert-mirror':'uploaded-ncert',url:sourceUrl||undefined,...(attention?{sources:attention.sources}:{})},caption:attention?'Class-aligned supplementary notes':sourceUrl?'NCERT mirror recovery · IIT Kanpur SATHEE':slide.caption});
 }
 return {slides:output,extraEvidence};
}
