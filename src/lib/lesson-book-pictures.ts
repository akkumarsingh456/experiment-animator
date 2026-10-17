import type { Slide } from '@/lib/generate.functions';
import type { ReferenceVisual } from '@/lib/reference-visuals';

export function bookPicturesExportNotice(eligible: boolean, count: number): string | undefined {
  if (eligible && count === 0) return 'Downloading the available notes. Med Easy pictures are still pending; resume book pictures and download again to include them.';
}

/** Picture refresh must never alter approved lesson text, even with old formula payloads. */
export function mergeLessonBookPictures(slides: Slide[], pictures: Array<{ title: string; visuals: ReferenceVisual[]; formula_lines?: string[] }>): Slide[] {
  return slides.map((slide, index) => {
    const match = pictures[index];
    if (!match || match.title !== slide.title || slide.kind === 'break' || slide.kind === 'mcq') return slide;
    // Chapter PDF pages have already been rendered in the browser. The generic
    // catalogue refresh has no replacement for them and must never erase them.
    if (slide.teacher_pdf) return slide;
    const existing = slide.reference_visuals || [];
    const merged = new Map(existing.map(visual => [visual.storage_path, visual]));
    for (const visual of match.visuals) {
      if(visual.url || !merged.has(visual.storage_path)) merged.set(visual.storage_path, visual);
    }
    return { ...slide, reference_visuals: [...merged.values()] };
  });
}
