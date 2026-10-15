import type { NoteSectionLike } from "@/lib/notes-paging";
import { prosePoints } from "@/lib/note-points";

/** Estimate rendered rows, accounting for card padding, math and memory explanations. */
function lineRows(line: string, heading: string): number {
  const plain = line.replace(/\$\$?|\\[a-zA-Z]+/g, "x");
  if (heading === "MLT Dimensional Formula" && line.split(" | ").length === 3) {
    const [quantity, , memory] = line.split(" | ");
    return 5 + Math.ceil(quantity.length / 65) + Math.ceil(memory.length / 65);
  }
  const formula = /^\s*\*{0,2}(formula|equation|relation|derivation)/i.test(line);
  return Math.max(1, Math.ceil(plain.length / 65)) + (formula ? 3 : 0) + 0.5;
}

/** Split unusually long prose without cutting a LaTeX expression or deleting words. */
function continuationLines(line: string): string[] {
  if (line.length < 500 || /^\s*\*{0,2}(formula|equation|relation|derivation)/i.test(line)) return [line];
  const math: string[] = [];
  const masked = line.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, expression => {
    math.push(expression); return `\uE000${math.length - 1}\uE001`;
  });
  if (masked.includes("$")) return [line];
  const result: string[] = []; let part = "";
  for (const word of masked.split(/\s+/)) {
    if (part.length + word.length > 420 && part) { result.push(part); part = ""; }
    part += (part ? " " : "") + word;
  }
  if (part) result.push(part);
  return result.map(value => value.replace(/\uE000(\d+)\uE001/g, (_, index) => math[Number(index)]));
}

/** Layout only: preserve every source point; continue long proofs at step boundaries. */
export function paginateLectureSections(sections: NoteSectionLike[] | undefined, maxRows = 18): NoteSectionLike[][] {
  const pages: NoteSectionLike[][] = [];
  let current: NoteSectionLike[] = [], rows = 0;
  let derivationTarget: string | undefined;
  const flush = () => { if (current.length) pages.push(current); current = []; rows = 0; };
  for (const section of sections || []) {
    // Cards and equations remain atomic; prose may continue at sentence boundaries.
    const lines = section.lines.flatMap(line => section.heading === "MLT Dimensional Formula" || section.kind === "diagram" ? [line] : prosePoints(line).flatMap(continuationLines));
    for (const line of lines) {
      const isStep = /^\s*\*\*derivation step/i.test(line);
      if (/^\s*\*\*derivation of/i.test(line)) derivationTarget = line;
      else if (!isStep) derivationTarget = undefined;
      const cost = lineRows(line, section.heading);
      const same = current.at(-1)?.heading === section.heading && current.at(-1)?.kind === section.kind;
      if (rows && rows + cost + (same ? 0 : 2) > maxRows) {
        flush();
        if (isStep && derivationTarget) {
          current.push({...section, lines: [derivationTarget]});
          rows = 2 + lineRows(derivationTarget, section.heading);
        }
      }
      if (current.at(-1)?.heading !== section.heading || current.at(-1)?.kind !== section.kind) {
        current.push({...section, lines: []}); rows += 2;
      }
      current.at(-1)!.lines.push(line); rows += cost;
    }
  }
  flush();
  return pages.length ? pages : [sections || []];
}
