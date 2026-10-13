import {splitMath, isValidLatex} from '@/lib/latex-notation';
import {guidedFormulaRow} from '@/lib/guided-notes';
import type {Slide} from '@/lib/generate.functions';
export type FormulaVisualCard = {label:string; expression:string; unit:string};

/** Reuse existing relations verbatim; this presentation helper never generates math. */
export function formulaVisualCards(slide: Pick<Slide,'sections'|'notes'|'bullets'>, limit=2):FormulaVisualCard[] {
  if (limit <= 0) return [];
  const lines = [...(slide.sections || []).flatMap(section => section.lines), ...(slide.notes || []), ...(slide.bullets || [])];
  const seen = new Set<string>();
  const cards:FormulaVisualCard[] = [];
  for (const line of lines) {
    if (!/^\s*\*\*(?:formula|equation|relation|result):\*\*/i.test(line)) continue;
    const row = guidedFormulaRow(line.replace(/^\s*\*\*[^*]+:\*\*\s*/,''));
    for (const segment of splitMath(row.expression)) {
      if (segment.type === 'text' || !isValidLatex(segment.value) || !/[=∝]|\\(?:propto|approx|equiv|rightarrow|rightleftharpoons)\b/.test(segment.value)) continue;
      const key = segment.value.replace(/\s/g,'');
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push({label:row.concept, expression:segment.value, unit:row.unit});
      if (cards.length >= Math.max(0, limit)) return cards;
    }
  }
  return cards;
}
