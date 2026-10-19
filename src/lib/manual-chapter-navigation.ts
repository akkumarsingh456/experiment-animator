import type { PDFDocumentProxy } from "pdfjs-dist";
import { canonicalBookChapter, contentsHeadingMatches } from "./book-chapter-priority";
const resolved = new WeakMap<PDFDocumentProxy, Map<string, number>>();

/** Bookmarks and actual PDF labels are physical-page evidence. Printed page
 * numbers alone are not. Native-text probes are bounded and never run OCR. */
export async function findManualChapterPage(pdf: PDFDocumentProxy, subject: string, chapter: string,
  printedRange?: { start: number; end: number }, signal?: AbortSignal): Promise<number | null> {
  const key = `${subject}:${canonicalBookChapter(subject, chapter)}`;
  const previous = resolved.get(pdf)?.get(key);
  if (previous) return previous;
  const save = (page: number) => {
    if (!resolved.has(pdf)) resolved.set(pdf, new Map());
    resolved.get(pdf)!.set(key, page); return page;
  };
  const active = () => { if (signal?.aborted) throw new DOMException("Closed reader", "AbortError"); };
  if (!chapter) return null;
  active();
  const outline = typeof pdf.getOutline === "function" ? await pdf.getOutline().catch(() => null) : null;
  type Outline = NonNullable<Awaited<ReturnType<PDFDocumentProxy["getOutline"]>>>[number];
  const queue: Outline[] = [...(outline || [])];
  while (queue.length) {
    active(); const entry = queue.shift()!; queue.push(...(entry.items || []));
    if (canonicalBookChapter(subject, entry.title) !== canonicalBookChapter(subject, chapter) || !entry.dest) continue;
    try {
      const dest = typeof entry.dest === "string" ? await pdf.getDestination(entry.dest) : entry.dest;
      if (!dest?.length) continue;
      const page = (typeof dest[0] === "number" ? dest[0] : await pdf.getPageIndex(dest[0])) + 1;
      if (Number.isInteger(page) && page >= 1 && page <= pdf.numPages) return save(page);
    } catch { /* Another bookmark or a native heading may still verify the chapter. */ }
  }
  active();
  const labels = printedRange && typeof pdf.getPageLabels === "function" ? await pdf.getPageLabels().catch(() => null) : null;
  if (labels && printedRange) {
    const matches = labels.flatMap((label, index) => label === String(printedRange.start) ? [index + 1] : []);
    if (matches.length === 1) return save(matches[0]);
  }
  // Check the contents/early headings and a small window near an attested printed
  // range. Every candidate must contain the actual chapter heading before use.
  const candidates = [...new Set([
    ...(printedRange ? Array.from({ length: 17 }, (_, i) => printedRange.start + i) : []),
    ...Array.from({ length: Math.min(16, pdf.numPages) }, (_, i) => i + 1),
  ])].filter(page => page >= 1 && page <= pdf.numPages);
  for (let index = 0; index < candidates.length; index += 3) {
    active();
    const matches = await Promise.all(candidates.slice(index, index + 3).map(async number => {
      try {
        const page = await pdf.getPage(number); active();
        const content = await page.getTextContent();
        let text = "";
        for (const item of content.items) if ("str" in item) text += item.str + (item.hasEOL ? "\n" : " ");
        if (/\b(?:contents|table of contents|index)\b/i.test(text.slice(0, 180))) return null;
        return contentsHeadingMatches(subject, text, chapter) ? number : null;
      } catch { active(); return null; }
    }));
    const match = matches.find((page): page is number => page !== null);
    if (match) return save(match);
  }
  return null;
}
