import type { Slide } from '@/lib/generate.functions';
import type { ReferenceVisual } from '@/lib/reference-visuals';

/** A capture refresh changes pictures only; approved notes retain their identity. */
export function mergeLessonBookPictures(slides: Slide[], pictures: Array<{ title: string; visuals: ReferenceVisual[] }>): Slide[] {
  return slides.map((slide, index) => {
    const match = pictures[index];
    if (!match || match.title !== slide.title || slide.kind === 'break' || slide.kind === 'mcq') return slide;
    return { ...slide, reference_visuals: match.visuals };
  });
}
