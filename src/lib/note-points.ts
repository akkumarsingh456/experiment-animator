/** Layout only: keep source words and math verbatim, split prose at sentence boundaries. */
import {isDependentSourceDefinition} from './source-explanation-context';
export function prosePoints(line: string): string[] {
  if (line.length < 90) return [line];
  const label = line.match(/^(\s*\*\*[^*]+:\*\*\s*)([\s\S]*)$/);
  if (/^\s*\*{0,2}(?:formulas?|equations?|relations?|results?|derivations?|variables?|si units?|units?|dimensions?)\b/i.test(line)) return [line];
  const prefix = label?.[1] || "";
  const body = label?.[2] ?? line;
  const math: string[] = [];
  const masked = body.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, value => {
    math.push(value);
    return `\uE000${math.length - 1}\uE001`;
  });
  // An incomplete math delimiter is safer left in its original block.
  if (masked.includes("$") || /\\[([]/.test(masked)) return [line];
  const points: string[] = [];
  let start = 0;
  const boundaries = /[.!?][”’"')]*\s+(?=[\p{L}“"(])|\n\s*\n|(?<=\S)[;]\s+(?=\p{L})|\(\d+\.\d+\)\s+(?=\p{Lu})/gu;
  for (const match of masked.matchAll(boundaries)) {
    const end = match.index! + match[0].trimEnd().length;
    const before = masked.slice(start, end);
    if(isDependentSourceDefinition(masked.slice(match.index!+match[0].length)))continue;
    // Keep figure/equation references, initials and common abbreviations together.
    if (/(?:\b(?:Fig|Figs|Eq|Eqs|Dr|Mr|Mrs|Ms|Prof|No|e\.g|i\.e|etc)|\b[A-Z])\.$/i.test(before)) continue;
    points.push(before.trim());
    start = match.index! + match[0].length;
  }
  points.push(masked.slice(start).trim());
  const restored = points.filter(Boolean).map(point => prefix + point.replace(/\uE000(\d+)\uE001/g, (_, index) => math[Number(index)]!));
  return restored.length > 1 ? restored : [line];
}

export function sectionPoints(heading: string, kind: string, lines: string[]): string[] {
  if ((heading === "Source table — original extracted entries" || heading === "Source review — original extraction") || kind === "diagram" || /\b(?:formulas?|equations?|relations?|derivations?)\b/i.test(heading)) return lines;
  return lines.flatMap(prosePoints);
}
