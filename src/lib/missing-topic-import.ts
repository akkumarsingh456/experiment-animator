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
 if(!slide.topic_recovery||slide.teacher_pdf||slide.teacher_next_class||slide.kind==='mcq'||slide.visual==='cover')return slide;
 const retained=(slide.sections||[]).filter(section=>section.heading!==AI_TOPIC_HEADING&&section.heading!=="AI supplementary teacher notes").map(section=>({...section,lines:section.lines.filter(line=>!/^\s*(?:Readable source text for .+ is unavailable\.|Re-ingest the matching chapter PDF|This topic needs (?:source )?notes)/i.test(line))})).filter(section=>section.lines.length);
 const existing=new Set(retained.flatMap(section=>section.lines).map(line=>line.trim()));
 const additions=[...new Set(lines.map(line=>line.trim()).filter(Boolean))].filter(line=>!existing.has(line));
 const sections:NonNullable<Slide['sections']>=[...retained,...(additions.length?[{heading:AI_TOPIC_HEADING,kind:'bullets' as const,lines:additions}]:[])];
 return {...slide,sections,caption:'Supplementary teacher notes · extracted by the teacher',topic_recovery:{status:'teacher',sourceUrl},notes_quality:reviewNotes(sections,false)};
}
