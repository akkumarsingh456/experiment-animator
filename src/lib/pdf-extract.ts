// Client-side PDF text extraction using pdfjs-dist.
// Reads the entire PDF, returns per-page text plus a flat joined string.

import * as pdfjsLib from "pdfjs-dist";
// Use the worker bundled with pdfjs-dist via Vite's ?url import.
// This avoids hosting an external worker file.
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export type ExtractedPdf = {
  numPages: number;
  pages: { page: number; text: string }[];
  fullText: string;
};

export async function extractPdfText(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<ExtractedPdf> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const doc = await loadingTask.promise;
  const pages: { page: number; text: string }[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push({ page: i, text });
    onProgress?.(i, doc.numPages);
  }

  return {
    numPages: doc.numPages,
    pages,
    fullText: pages.map((p) => p.text).join("\n\n"),
  };
}

// Simple chunker: ~1200 chars with ~150 char overlap. Splits on whitespace.
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
