import {z} from 'zod';
import type {Slide} from './generate.functions';
import {reviewNotes} from './learning-design';

export const importedTopicDraft=z.object({
 lines:z.array(z.string().min(1).max(1800)).min(1).max(500),
 sources:z.array(z.object({url:z.string().url().max(2000),title:z.string().max(500)})).max(12),
});
export const AI_TOPIC_HEADING='Supplementary teacher notes';
/** Add to an incomplete topic, retaining readable original facts and its visual identity. */
export function importMissingTopicNotes(slide:Slide,lines:string[],sourceUrl=''):Slide{
 if(slide.teacher_pdf||slide.teacher_next_class||slide.kind==='mcq'||slide.kind==='break'||slide.visual==='cover')return slide;
 const fallback=slide.chapter_text?slide.chapter_text.split(/\n\s*\n/).filter(Boolean):[...slide.bullets,...slide.notes];
 const base=slide.sections?.length?slide.sections:fallback.length?[{heading:'Original topic notes',kind:'bullets' as const,lines:fallback}]:[];
 const retained=base.filter(section=>section.heading!==AI_TOPIC_HEADING&&section.heading!=="AI supplementary teacher notes").map(section=>({...section,lines:section.lines.filter(line=>!/^\s*(?:Readable source text for .+ is unavailable\.|Re-ingest the matching chapter PDF|This topic needs (?:source )?notes)/i.test(line))})).filter(section=>section.lines.length);
 const existing=new Set(retained.flatMap(section=>section.lines).map(line=>line.trim()));
 const additions=[...new Set(lines.map(line=>line.trim()).filter(Boolean))].filter(line=>!existing.has(line));
 const sections:NonNullable<Slide['sections']>=[...retained,...(additions.length?[{heading:AI_TOPIC_HEADING,kind:'bullets' as const,lines:additions}]:[])];
 return {...slide,sections,teacher_supplement:{lines:[...new Set(lines)],sourceUrl},caption:slide.caption||'Supplementary teacher notes · extracted by the teacher',...(slide.topic_recovery?{topic_recovery:{status:'teacher' as const,sourceUrl}}:{}),notes_quality:reviewNotes(sections,false)};
}
