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
    const existing = (slide.sections || []).flatMap(section => section.lines);
    const knownLines = new Set(existing.map(line => line.trim()));
    const knownFormulas = new Set(existing.filter(line => /^\*\*(?:formula|equation|relation):/i.test(line)).map(formulaIdentity));
    const knownHeads = new Set(existing.filter(line => /^\*\*derivation of/i.test(line)).map(line => line.replace(/:\*\*.*$/, "").toLowerCase()));
    const add: string[] = [];
    let skipSteps = false;
    for (const line of match.formula_lines || []) {
      if (/^\*\*derivation of/i.test(line)) {
        const head = line.replace(/:\*\*.*$/, "").toLowerCase();
        skipSteps = knownHeads.has(head);
        if (!skipSteps) { knownHeads.add(head); add.push(line); }
      } else if (/^\*\*derivation step/i.test(line)) {
        if (!skipSteps) add.push(line);
      } else if (/^\*\*(?:formula|equation|relation):/i.test(line)) {
        const identity = formulaIdentity(line);
        if (identity && !knownFormulas.has(identity)) { knownFormulas.add(identity); add.push(line); }
      } else if (line.trim() && !knownLines.has(line.trim())) { knownLines.add(line.trim()); add.push(line); }
    }
    if (!add.length) return { ...slide, reference_visuals: match.visuals };
    const first = slide.sections?.[0] || { heading: 'Teacher Notes', kind: 'bullets' as const, lines: [] };
    return { ...slide, reference_visuals: match.visuals, sections: [{ ...first, lines: [...first.lines, ...add] }, ...(slide.sections?.slice(1) || [])] };
  });
}
