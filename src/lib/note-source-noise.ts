import type { Slide } from "@/lib/generate.functions";

/** Identify collapsed textbook contents listings, without rewriting lesson prose. */
export function isContentsListing(raw: string): boolean {
  const text = String(raw || "");
  // Mathematical content is deliberately outside this filter's scope.
  if (/\$|[=∝]|\\(?:frac|sqrt|sum|int)\b/.test(text) ||
      /^\s*\*\*(?:formula|equation|relation|derivation|variable|si unit|unit|dimension)/i.test(text)) return false;
  const body = text.replace(/^\s*\*\*[^*]+:\*\*\s*/, "");
  if (body.length > 3000) return false;
  const sections = (body.match(/(?:^|\s)\d{1,2}\.\d{1,2}\s+(?=\p{L})/gu) || []).length;
  const pages = (body.match(/[\p{L}\p{M})]\s+\d{1,3}(?=\s|$)/gu) || []).length;
  const chapters = (body.match(/\bchapter\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b|अध्याय\s+\S+/gi) || []).length;
  const leaders = (body.match(/(?:\.\s*){3,}\d{1,3}/g) || []).length;
  return (sections >= 4 && pages >= 3) || (chapters >= 2 && pages >= 3) || leaders >= 3;
}

/** Apply the same presentation filter to old saved lessons and new lessons.
 * Retained strings are returned verbatim; formula/derivation sections are untouched.
 */
export function omitContentsListings(slide: Slide): Slide {
  const keep = (line: string) => !isContentsListing(line);
  return {
    ...slide,
    bullets: slide.bullets.filter(keep),
    notes: slide.notes.filter(keep),
    sections: slide.sections?.map(section =>
      /formula|equation|derivation|unit|symbol|dimension|variable/i.test(section.heading) || section.kind === "formula" || section.kind === "diagram"
        ? section : { ...section, lines: section.lines.filter(keep) }
    ).filter(section => section.lines.length),
  };
}
