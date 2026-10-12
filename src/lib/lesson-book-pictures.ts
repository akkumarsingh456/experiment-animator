import type { Slide } from '@/lib/generate.functions';
import type { ReferenceVisual } from '@/lib/reference-visuals';
import { formulaIdentity } from '@/lib/source-formula-supplements';

export function bookPicturesExportNotice(eligible: boolean, count: number): string | undefined {
  if (eligible && count === 0) return 'Downloading the available notes. Med Easy pictures are still pending; resume book pictures and download again to include them.';
}

/** Refresh captures and append missing source formulas without rewriting approved lines. */
export function mergeLessonBookPictures(slides: Slide[], pictures: Array<{ title: string; visuals: ReferenceVisual[]; formula_lines?: string[] }>): Slide[] {
  return slides.map((slide, index) => {
    const match = pictures[index];
    if (!match || match.title !== slide.title || slide.kind === 'break' || slide.kind === 'mcq') return slide;
    const known = new Set((slide.sections || []).flatMap(section => section.lines).filter(line => /^\*\*(?:formula|equation|relation):/i.test(line)).map(formulaIdentity));
    const add = (match.formula_lines || []).filter(line => { const identity = formulaIdentity(line); if (!identity || known.has(identity)) return false; known.add(identity); return true; });
    if (!add.length) return { ...slide, reference_visuals: match.visuals };
    const first = slide.sections?.[0] || { heading: 'Teacher Notes', kind: 'bullets' as const, lines: [] };
    return { ...slide, reference_visuals: match.visuals, sections: [{ ...first, lines: [...first.lines, ...add] }, ...(slide.sections?.slice(1) || [])] };
  });
}
