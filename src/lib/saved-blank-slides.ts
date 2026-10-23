import type { Slide } from './generate.functions';
import { z } from 'zod';
import {importMissingTopicNotes} from './missing-topic-import';

const section = z.object({ heading: z.string(), kind: z.enum(['text', 'bullets', 'formula', 'terms', 'tip', 'diagram']), lines: z.array(z.string()) });
const savedSlide = z.object({ title: z.string(), teacher_blank: z.object({ id: z.string().uuid(), topic: z.string() }), kind: z.literal('content'), visual: z.literal('book'), bullets: z.array(z.string()), notes: z.array(z.string()), key_terms: z.array(z.object({ term: z.string(), meaning: z.string() })), sections: z.array(section).optional(), caption: z.string().optional() });
const position = z.object({ slide: savedSlide, index: z.number().int().min(0), after: z.string(), occurrence: z.number().int().min(0), offset: z.number().int().min(0).default(0) });
const addition=z.object({title:z.string(),occurrence:z.number().int().min(0),lines:z.array(z.string().min(1).max(1800)).max(500),sourceUrl:z.string().max(2000)});
export const blankSlideRecordSchema = z.object({ version: z.literal(1), blanks: z.array(position), deleted: position.nullable(),additions:z.array(addition).max(3000).optional() });
const record = blankSlideRecordSchema;
export type BlankSlideRecord = z.infer<typeof record>;
export type SavedBlankPosition = z.infer<typeof position>;
export const emptyBlankRecord = (): BlankSlideRecord => ({ version: 1, blanks: [], deleted: null });
export function blankSlidesKey(scope: string[]) { return 'eduplan-blank-slides-v1:' + JSON.stringify(scope.map(s => s.trim().replace(/\s+/g, ' '))); }
export function readBlankSlides(key: string): BlankSlideRecord {
  const value = localStorage.getItem(key);
  return value ? record.parse(JSON.parse(value)) : emptyBlankRecord();
}
export function blankPosition(slides: Slide[], index: number): SavedBlankPosition {
  let anchor = index - 1;
  while (anchor >= 0 && slides[anchor].teacher_blank) anchor--;
  const after = slides[anchor]?.title || slides[index].teacher_blank!.topic;
  return { slide: savedSlide.parse(slides[index]), index, after, offset: index - anchor - 1, occurrence: Math.max(0, slides.slice(0, anchor + 1).filter(s => !s.teacher_blank && s.title === after).length - 1) };
}
export function captureBlankSlides(slides: Slide[], deleted: SavedBlankPosition | null): BlankSlideRecord {
  return { version: 1, blanks: slides.flatMap((slide, index) => slide.teacher_blank ? [blankPosition(slides, index)] : []), deleted,additions:slides.flatMap((slide,index)=>slide.teacher_supplement&&!slide.teacher_blank?[{title:slide.title,occurrence:slides.slice(0,index).filter(item=>!item.teacher_blank&&item.title===slide.title).length,...slide.teacher_supplement}]:[]) };
}
/** Restore only explicit added slides. Every original object and its order survive. */
export function restoreBlankSlides(base: Slide[], saved: BlankSlideRecord): Slide[] {
  const result = base.map((slide,index)=>{
    const occurrence=base.slice(0,index).filter(item=>!item.teacher_blank&&item.title===slide.title).length;
    const savedAddition=saved.additions?.find(item=>item.title===slide.title&&item.occurrence===occurrence);
    return savedAddition&&!slide.teacher_blank?importMissingTopicNotes(slide,savedAddition.lines,savedAddition.sourceUrl):slide;
  });
  const seen = new Set(result.flatMap(s => s.teacher_blank ? [s.teacher_blank.id] : []));
  for (const item of saved.blanks) {
    if (seen.has(item.slide.teacher_blank.id)) continue;
    seen.add(item.slide.teacher_blank.id);
    const anchors = result.flatMap((s, index) => !s.teacher_blank && s.title === item.after ? [index] : []);
    let index = anchors[item.occurrence];
    if (index === undefined) index = result.findIndex(s => !s.teacher_blank && s.title === item.slide.teacher_blank.topic);
    if (index < 0 || index === undefined) index = Math.min(item.index, result.findIndex(s => s.kind === 'mcq') < 0 ? result.length : result.findIndex(s => s.kind === 'mcq')) - 1;
    index++;
    let offset = 0;
    while (index < result.length && result[index].teacher_blank && offset++ < item.offset) index++;
    result.splice(index, 0, item.slide as Slide);
  }
  return result;
}
