import type { Slide } from "./generate.functions";

/** A dense alphabetical term/page listing is source navigation, not lesson prose.
 * Equations, worked examples and scientific sentences are deliberately excluded.
 */
export function isTextbookIndex(raw: string): boolean {
  if (
    /^\s*\*\*(?:worked example|example|formula|equation|relation|derivation|calculation|observation|measurement|data|table)\b/i.test(
      raw,
    )
  )
    return false;
  const text = raw.replace(/^\s*\*\*[^*]+:\*\*\s*/, "");
  if (/\$|[=∝]|\\(?:frac|sqrt|sum|int)\b/.test(text)) return false;
  if (
    /\b(?:is|are|was|were|means|defined|calculate|find|given|therefore|hence|because|equals?|increases?|decreases?)\b/i.test(
      text,
    )
  )
    return false;
  const matches = Array.from(
    text.matchAll(/([\p{L}\p{M})]+)\s+\d{1,3}(?:\s*,\s*\d{1,3})*(?=\s|[.;]|$)/gu),
  );
  const entries = matches.length;
  const distinct = new Set(matches.map((match) => match[1].toLowerCase())).size;
  const words = (text.match(/[\p{L}\p{M}]+/gu) || []).length;
  return (
    (entries >= 12 && distinct >= 8 && words / entries < 9) ||
    (entries >= 4 && /\bTerms\s+Page\s+No\.?/i.test(text))
  );
}
const protectedSection = (heading: string, kind: string) =>
  /^Source (?:review|table)/i.test(heading) ||
  /formula|equation|derivation|dimension|unit|symbol|variable|\b(?:table|data|measurements?|observations?|results?)\b/i.test(
    heading,
  ) ||
  kind === "formula" ||
  kind === "diagram";
export function sourceIndexEntries(slide: Slide): string[] {
  if (slide.teacher_pdf || slide.kind === "mcq" || slide.kind === "break") return [];
  return [
    ...(slide.chapter_text ? [slide.chapter_text] : []),
    ...(slide.ncert_quote ? [slide.ncert_quote] : []),
    ...(slide.bullets || []),
    ...(slide.notes || []),
    ...(slide.sections || [])
      .filter((section) => !protectedSection(section.heading, section.kind))
      .flatMap((section) => section.lines),
  ].filter(isTextbookIndex);
}
/** A new view only. Uploaded files and saved/generated slide objects stay intact. */
export function readableIndexPresentation(slide: Slide): Slide {
  if (!sourceIndexEntries(slide).length) return slide;
  return {
    ...slide,
    chapter_text:
      slide.chapter_text && isTextbookIndex(slide.chapter_text) ? undefined : slide.chapter_text,
    ncert_quote:
      slide.ncert_quote && isTextbookIndex(slide.ncert_quote) ? undefined : slide.ncert_quote,
    bullets: (slide.bullets || []).filter((line) => !isTextbookIndex(line)),
    notes: (slide.notes || []).filter((line) => !isTextbookIndex(line)),
    sections: slide.sections
      ?.map((section) =>
        protectedSection(section.heading, section.kind)
          ? section
          : { ...section, lines: section.lines.filter((line) => !isTextbookIndex(line)) },
      )
      .filter((section) => section.lines.length),
  };
}
