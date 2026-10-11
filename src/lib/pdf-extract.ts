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
  options?: { recognizePage: (image: string, page: number, aspect: number) => Promise<string>; savedPages?: Map<number, string>; savePage?: (text: string, page: number) => Promise<void> },
): Promise<ExtractedPdf> {
  const pdfjs = await loadPdfjs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: { page: number; text: string }[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let text = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (options && text.replace(/scanned.*|oken.*|camscanner.*/gi, "").trim().length < 100) {
      const saved = options.savedPages?.get(i);
      if (saved !== undefined) text = saved;
      else {
        const natural = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2, 1800 / natural.width) });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        try {
          await page.render({ canvas, viewport }).promise;
          text = await options.recognizePage(canvas.toDataURL("image/jpeg", .9), i, canvas.width / canvas.height);
        } finally { canvas.width = canvas.height = 0; }
      }
    } else if (options?.savePage) await options.savePage(text, i);
    pages.push({ page: i, text });
    onProgress?.(i, doc.numPages);
  }

  return {
    numPages: doc.numPages,
    pages,
    fullText: pages.map((p) => p.text).join("\n\n"),
  };
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
