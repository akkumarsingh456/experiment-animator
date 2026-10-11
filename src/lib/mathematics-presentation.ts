import type { Slide } from "@/lib/generate.functions";

export const isMathematics = (subject?: string) => /^(math|maths|mathematics)$/i.test((subject || "").trim());

/** OCR has lost the matrix's two-dimensional positions; do not guess them. */
export function damagedMatrixExcerpt(line: string): boolean {
  if (/\$|\\(?:begin|frac|sqrt)\b/.test(line) || /^\s*\*\*(?:formula|equation|relation|derivation|variable|unit|si unit)/i.test(line)) return false;
  const indices = (line.match(/\b(?:11|12|13|21|22|23|31|32|33)\b/g) || []).length;
  const isolated = (line.match(/\ba\b/g) || []).length;
  return indices >= 8 && isolated >= 6;
}

/** Mathematics-only handling of short contents fragments, before display. */
export function mathematicsPresentationSlide(slide: Slide, subject?: string): Slide {
  if (!isMathematics(subject)) return slide;
  const keep = (line: string) => {
    if (/\$|[=∝]|\\(?:frac|begin)\b/.test(line) || /^\s*\*\*(?:formula|derivation|variable|unit|si unit)/i.test(line)) return true;
    const sections = (line.match(/(?:^|\s)\d{1,2}\.\d{1,2}\s+(?=\p{L})/gu) || []).length;
    const pages = (line.match(/[\p{L}\p{M})]\s+\d{1,3}(?=\s|$)/gu) || []).length;
    return !(sections >= 3 && pages >= 3 && line.length < 1500);
  };
  return { ...slide, bullets: slide.bullets.filter(keep), notes: slide.notes.filter(keep),
    sections: slide.sections?.map(section => /formula|derivation|unit|variable|symbol/i.test(section.heading) || section.kind === "formula" || section.kind === "diagram" ? section : { ...section, lines: section.lines.filter(keep) }).filter(section => section.lines.length) };
}
