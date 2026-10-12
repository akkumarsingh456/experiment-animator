import { splitReferenceContent } from "@/lib/reference-visuals";
import { isContentsListing } from "@/lib/note-source-noise";
const key = (value: string) => value.toLowerCase().replace(/^chapter\s*\d+\s*[:.\-]?\s*/i, "").replace(/^the\s+/, "").replace(/[^\p{L}\p{N}]/gu, "").replace(/^chemicalthermodynamics$/, "thermodynamics");

/** Keep whole chapter pages in order; keyword hits alone can cross chapters. */
export function scopeTextbookPages(pages: Array<{ page_number: number; text: string }>, chapter: string, chapterNames: string[]): string[] {
  const wanted = key(chapter);
  if (!wanted) return [];
  const names = [...new Set([...chapterNames.map(key), wanted])].filter(name => name.length >= 4);
  let current = "";
  const result: string[] = [];
  for (const page of [...pages].sort((a,b) => a.page_number-b.page_number)) {
    const text = splitReferenceContent(page.text).text.replace(/^\[SOURCE_OCR_PAGE\]\s*/, "");
    if (!text.trim() || isContentsListing(text) || /^\s*(?:contents|table of contents)\b/i.test(text)) continue;
    const header = key(text.slice(0, 600));
    const hits = names.map(name => ({ name, at: header.indexOf(name) })).filter(hit => hit.at >= 0).sort((a,b) => a.at-b.at || b.name.length-a.name.length);
    if (hits.length) current = hits[0].name;
    if (current === wanted) result.push(text);
  }
  return result;
}

/** OCR describes the actual saved picture; it is formula evidence, not prose notes. */
export function referenceFormulaEvidence(content: string, chapter: string): string {
  const source = splitReferenceContent(content);
  if (source.context?.chapter && key(source.context.chapter) !== key(chapter)) return "";
  const indexes = source.visuals.filter(visual => key(visual.chapter || source.context?.chapter || "") === key(chapter))
    .map(visual => visual.capture === "page" ? visual.match_text || "" : `${visual.title}: ${visual.description}`);
  return [source.text, ...indexes].filter(Boolean).join("\n\n");
}
