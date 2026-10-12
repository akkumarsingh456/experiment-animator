import { supabase } from "@/integrations/supabase/client";
import { combinedReferenceMatches } from "@/lib/reference-books";
import { extractPdfText } from "@/lib/pdf-extract";
import { signDownload, classifyMedEasyLibrary } from "@/lib/ingest.functions";
import { readScannedPage, finishReferenceReading, saveExtractedReferencePage } from "@/lib/reference-ocr.functions";
import { splitReferenceContent } from "@/lib/reference-visuals";
import { retryBookRead } from "@/lib/book-read-recovery";
export type ReferenceReadSummary = { book: string; pages: number; figures: number; chapters: number };

/** Read the existing uploaded scans once, checkpointing each page for resumption. */
export async function prepareScannedReferenceBooks(klass: string, subject: string, progress: (message: string) => void, cancelled: () => boolean = () => false, onPicturesSaved?: () => Promise<void>) {
  const summaries: ReferenceReadSummary[] = [];
  if (!/11|12/.test(klass)) return summaries;
  await retryBookRead(() => classifyMedEasyLibrary(), { stopped: cancelled, progress, label: "Preparing book labels" });
  const { data: inventory, error } = await supabase.from("ncert_books").select("id,class,subject,chapter,file_name,storage_path,num_pages,num_chunks").or("file_name.ilike.%MED EASY%,file_name.ilike.%MEDEASY%").limit(100);
  if (error) throw new Error(error.message);
  const unique = new Map<string, NonNullable<typeof inventory>[number]>();
  for (const book of inventory || []) {
    if (!combinedReferenceMatches(book, klass, subject)) continue;
    const name = book.file_name.trim().toLowerCase();
    if (!unique.has(name) || (unique.get(name)!.num_chunks || 0) < (book.num_chunks || 0)) unique.set(name, book);
  }
  for (const book of unique.values()) {
    if (cancelled()) return summaries;
    progress(`Reading scanned reference notes: ${book.file_name}`);
    const { data: saved, error: savedError } = await supabase.from("ncert_pages").select("page_number,text").eq("book_id", book.id).order("page_number").limit(1000);
    if (savedError) throw new Error(savedError.message);
    const savedPages = new Map((saved || []).filter(page => page.text.startsWith("[SOURCE_OCR_PAGE]\n") && splitReferenceContent(page.text).context?.visuals_checked === true).map(page => [page.page_number, page.text.replace(/^\[SOURCE_OCR_PAGE\]\n/, "")]));
    if (savedPages.size === book.num_pages && (book.num_chunks || 0) === book.num_pages) {
      const pages = [...savedPages.values()].map(splitReferenceContent);
      summaries.push({ book: book.file_name, pages: savedPages.size, figures: pages.reduce((sum,page) => sum + page.visuals.length, 0), chapters: new Set(pages.map(page => page.context?.chapter).filter(Boolean)).size });
      continue;
    }
    const file = await retryBookRead(async () => {
      const ticket = await signDownload({ data: { path: book.storage_path } });
      const response = await fetch(ticket.signedUrl);
      if (!response.ok) throw new Error(`Could not read the uploaded ${book.file_name}.`);
      return response.blob();
    }, { stopped: cancelled, progress, label: `Opening ${book.file_name}` });
    let chapterHint = "";
    const extracted = await extractPdfText(file, (page, total) => {
      chapterHint = splitReferenceContent(savedPages.get(page) || "").context?.chapter || chapterHint;
      progress(`Reading ${book.file_name} · page ${page} of ${total}`);
    }, {
      inspectEveryPage: true,
      savedPages,
      savePage: async (text, page) => {
        if (cancelled()) throw new Error("Reference-book reading paused. Completed pages are saved.");
        if (!savedPages.has(page)) await saveExtractedReferencePage({ data: { book_id: book.id, page, text } });
      },
      recognizePage: async (image, page, aspect) => {
        if (cancelled()) throw new Error("Reference-book reading paused. Completed pages are saved.");
        const content = await retryBookRead(() => readScannedPage({ data: { image, page, aspect, book_id: book.id, chapter_hint: chapterHint } }), { stopped: cancelled, progress, label: `${book.file_name} · page ${page}` });
        savedPages.set(page, content);
        const captured = splitReferenceContent(content);
        chapterHint = captured.context?.chapter || chapterHint;
        // The server has saved the original page and crop coordinates already.
        // Attach useful images immediately, without waiting for the whole book.
        if (captured.visuals.length && !cancelled()) await onPicturesSaved?.();
        return content;
      },
    });
    const completed = await retryBookRead(() => finishReferenceReading({ data: { book_id: book.id, num_pages: extracted.numPages } }), { stopped: cancelled, progress, label: `Saving ${book.file_name}` });
    summaries.push({ book: book.file_name, ...completed });
    progress(`${book.file_name}: ${completed.pages} pages inspected, ${completed.figures} book screenshots saved across ${completed.chapters} chapters.`);
  }
  return summaries;
}
