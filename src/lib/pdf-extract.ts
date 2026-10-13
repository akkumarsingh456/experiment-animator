import { parseBookContents, canonicalBookChapter, chapterReadingOrder, contentsHeadingMatches } from "@/lib/book-chapter-priority";
import { indexLocalBookPage } from "@/lib/local-book-index";
import { splitReferenceContent } from '@/lib/reference-visuals';
// Client-side PDF text extraction using pdfjs-dist.
// pdfjs is imported dynamically so SSR (which lacks DOMMatrix) doesn't crash.

export type ExtractedPdf = {
  numPages: number;
  pages: { page: number; text: string }[];
  fullText: string;
};

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
async function loadPdfjs() {
  if (typeof window === "undefined") {
    throw new Error("PDF extraction must run in the browser.");
  }
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url"))
        .default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export async function extractPdfText(
  file: File | Blob,
  onProgress?: (page: number, total: number) => void,
  options?: { recognizePage: (image: string, page: number, aspect: number, nativeText?: string) => Promise<string>; savedPages?: Map<number, string>; savePage?: (text: string, page: number) => Promise<void>; inspectEveryPage?: boolean; priorityChapter?: { subject: string; chapter: string }; chapterOnly?: boolean; recognizeIndex?: (image: string, nativeText: string, page: number, aspect: number) => Promise<string>; beforePage?: (page: number, previousPage: number) => void; cancelled?: () => boolean },
): Promise<ExtractedPdf> {
  const pdfjs = await loadPdfjs();
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: buffer });
  const doc = await loadingTask.promise;
  const pages: { page: number; text: string }[] = [];

  try {
  let order = Array.from({length: doc.numPages}, (_,i)=>i+1);
  const indexText = new Map<number, string>();
  let verifiedChapter=false;
  async function inspectIndex(number: number) {
    if (options?.cancelled?.()) throw new Error("Reference-book reading paused. Completed pages are saved.");
    if (indexText.has(number)) return indexText.get(number)!;
    const saved=options?.savedPages?.get(number);
    if(saved){const parsed=splitReferenceContent(saved);const text=parsed.context?.match_text || parsed.text;if(text.trim()){indexText.set(number,text);return text;}}
    const page = await doc.getPage(number);
    const content = await page.getTextContent();
    const native = content.items.map(it => "str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "").join("");
    const natural = page.getViewport({scale:1});
    const viewport = page.getViewport({scale:2400/natural.width});
    const canvas = document.createElement("canvas"); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    try {
      await page.render({canvas,viewport}).promise;
      const text = await options!.recognizeIndex!(canvas.toDataURL("image/jpeg",.9),native,number,canvas.width/canvas.height);
      indexText.set(number,text); return text;
    } finally {canvas.width=canvas.height=0;}
  }
  if (options?.priorityChapter && options.recognizeIndex) {
    const {subject,chapter} = options.priorityChapter;
    const wanted = canonicalBookChapter(subject,chapter);
    // TOC page numbers belong to the printed book. Verify a chapter header in
    // the actual PDF before using any offset; never assign a guessed chapter.
    const ranges: ReturnType<typeof parseBookContents> = [];
    let lastContents = 0;
    for (let page=2;page<=Math.min(10,doc.numPages);page++) {
      onProgress?.(page,doc.numPages);
      const text = await inspectIndex(page);
      const found = parseBookContents(subject,text);
      if (found.length >= 2) {ranges.push(...found);lastContents=page;}
      else if (lastContents && page>lastContents+1) break;
    }
    const matches=ranges.filter(range=>canonicalBookChapter(subject,range.chapter)===wanted).sort((a,b)=>a.start-b.start);
    const target=matches[0]?{...matches[0]}:undefined;
    if(target)for(const range of matches.slice(1)){if(range.start>target.end+1)break;target.end=Math.max(target.end,range.end);}
    if(target) {
      // Front matter suggests where to look, but only the actual chapter
      // heading authorizes prioritising a page. A damaged earlier TOC entry
      // must not prevent a correctly recognised requested chapter being read.
      const expected=target.start+lastContents;
      const candidates=Array.from({length:25},(_,i)=>target.start-3+i)
        .filter(page=>page>=1 && page<=doc.numPages)
        .sort((a,b)=>Math.abs(a-expected)-Math.abs(b-expected));
      for(const page of candidates) {
        if(contentsHeadingMatches(subject, await inspectIndex(page), target.chapter)) {
          order=options.chapterOnly ? Array.from({length:Math.min(target.end-target.start+1,doc.numPages-page+1)},(_,i)=>page+i) : chapterReadingOrder(doc.numPages,page,page+target.end-target.start);verifiedChapter=true; break;
        }
      }
    }
  }
  if(options?.chapterOnly&&!verifiedChapter)throw new Error('The chapter page range needs review. Saved pictures remain available; no whole-book scan was started.');
  let previousPage=0;
  for (const i of order) {
    if (options?.cancelled?.()) throw new Error("Reference-book reading paused. Completed pages are saved.");
    options?.beforePage?.(i,previousPage); previousPage=i;

    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const nativeText = content.items.map((it) => "str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "").join("");
    let text = nativeText
      .replace(/\s+/g, " ")
      .trim();
    // Med Easy diagrams must be inspected even when a page has a usable text
    // layer. Text extraction alone cannot recover its structures or mind maps.
    if (options && (options.inspectEveryPage || text.replace(/scanned.*|oken.*|camscanner.*/gi, "").trim().length < 100)) {
      const saved = options.savedPages?.get(i);
      if (saved !== undefined) text = saved;
      else {
        const natural = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 1800 / natural.width });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        try {
          await page.render({ canvas, viewport }).promise;
          text = await options.recognizePage(canvas.toDataURL("image/jpeg", .9), i, canvas.width / canvas.height, indexText.get(i) || nativeText);
        } finally { canvas.width = canvas.height = 0; }
      }
    } else if (options?.savePage) await options.savePage(text, i);
    pages.push({ page: i, text });
    onProgress?.(i, doc.numPages);
  }

  pages.sort((a,b)=>a.page-b.page);
  const numPages = doc.numPages;
  return {
    numPages,
    pages,
    fullText: pages.map((p) => p.text).join("\n\n"),
  };
  } finally { await loadingTask.destroy(); }
}

export function chunkText(text: string, size = 1200, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= size) return [clean];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(" ", end);
      if (lastSpace > start + size * 0.6) end = lastSpace;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}
