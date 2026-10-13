import { supabase } from "@/integrations/supabase/client";
import { screenshotBookMatches, combinedReferenceSubject } from "@/lib/reference-books";
import { extractPdfText } from "@/lib/pdf-extract";
import { signDownload, classifyMedEasyLibrary } from "@/lib/ingest.functions";
import { finishReferenceReading, saveExtractedReferencePage } from "@/lib/reference-ocr.functions";
import { saveCapturedReferencePage } from "@/lib/reference-capture.functions";
import { createLocalBookReader } from "@/lib/local-book-reader";
import { splitReferenceContent } from "@/lib/reference-visuals";
import { retryBookRead } from "@/lib/book-read-recovery";
export type ReferenceReadSummary = { book: string; pages: number; figures: number; chapters: number; unmatchedPages?: number; error?: string };

/** Read the existing uploaded scans once, checkpointing each page for resumption. */
let readingQueue:Promise<void>=Promise.resolve();
export function prepareScannedReferenceBooks(...args:Parameters<typeof readReferenceBooks>):ReturnType<typeof readReferenceBooks>{
  const task=readingQueue.then(()=>readReferenceBooks(...args));
  readingQueue=task.then(()=>{},()=>{});
  return task;
}
async function readReferenceBooks(klass: string, subject: string, progress: (message: string) => void, cancelled: () => boolean = () => false, onPicturesSaved?: () => Promise<void>, chapter?: string, options?:{medEasyOnly?:boolean}) {
  const summaries: ReferenceReadSummary[] = [];
  if(cancelled())return summaries;
  await retryBookRead(() => classifyMedEasyLibrary(), { stopped: cancelled, progress, label: "Preparing book labels" });
  const { data: inventory, error } = await supabase.from("ncert_books").select("id,class,subject,chapter,file_name,storage_path,num_pages,num_chunks").limit(1000);
  if (error) throw new Error(error.message);
  if (inventory?.length === 1000) {
    for (let from = 1000; ; from += 1000) {
      const { data: extra, error: extraError } = await supabase.from("ncert_books").select("id,class,subject,chapter,file_name,storage_path,num_pages,num_chunks").range(from, from + 999);
      if (extraError) throw new Error(extraError.message);
      inventory.push(...(extra || []));
      if (!extra || extra.length < 1000) break;
    }
  }
  const indexedCounts = new Map<string, number>();
  if(options?.medEasyOnly && inventory)inventory.splice(0,inventory.length,...inventory.filter(book=>!!combinedReferenceSubject(book)));
  for (const book of inventory || []) {
    if (!screenshotBookMatches(book, klass, subject)) continue;
    const { count } = await supabase.from("ncert_pages").select("page_number", { count: "exact", head: true }).eq("book_id", book.id);
    indexedCounts.set(book.id, count || 0);
  }
  const unique = new Map<string, NonNullable<typeof inventory>[number]>();
  for (const book of inventory || []) {
    if (!screenshotBookMatches(book, klass, subject)) continue;
    const name = `${book.class}|${book.subject}|${book.file_name.trim().toLowerCase()}`;
    const current = unique.get(name);
    if (!current || (indexedCounts.get(current.id) || 0) < (indexedCounts.get(book.id) || 0)) unique.set(name, book);
  }
  const reader = createLocalBookReader(progress);
  const queue = [...unique.values()].sort((a, b) => Number(!!combinedReferenceSubject(b)) - Number(!!combinedReferenceSubject(a)));
  try { for (const book of queue) { try {
    if (cancelled()) return summaries;
    progress(`Reading scanned reference notes: ${book.file_name}`);
    const { data: saved, error: savedError } = await supabase.from("ncert_pages").select("page_number,text").eq("book_id", book.id).order("page_number").limit(1000);
    if (savedError) throw new Error(savedError.message);
    if (saved?.length === 1000) {
      for (let from = 1000; ; from += 1000) {
        const { data: extra, error: extraError } = await supabase.from("ncert_pages").select("page_number,text").eq("book_id", book.id).order("page_number").range(from, from + 999);
        if (extraError) throw new Error(extraError.message);
        saved.push(...(extra || []));
        if (!extra || extra.length < 1000) break;
      }
    }
    const savedPages = new Map((saved || []).filter(page => splitReferenceContent(page.text).context?.capture_saved === true && splitReferenceContent(page.text).context?.visuals_checked === true && splitReferenceContent(page.text).context?.index_version === 2).map(page => [page.page_number, page.text.replace(/^\[SOURCE_OCR_PAGE\]\n/, "")]));
    if (savedPages.size === book.num_pages) {
      const pages = [...savedPages.values()].map(splitReferenceContent);
      summaries.push({ book: book.file_name, pages: savedPages.size, figures: pages.reduce((sum,page) => sum + page.visuals.length, 0), chapters: new Set(pages.map(page => page.context?.chapter).filter(Boolean)).size, unmatchedPages: pages.filter(page => page.context?.needs_review).length });
      continue;
    }
    const file = await retryBookRead(async () => {
      const ticket = await signDownload({ data: { path: book.storage_path } });
      const response = await fetch(ticket.signedUrl);
      if (!response.ok) throw new Error(`Could not read the uploaded ${book.file_name}.`);
      return response.blob();
    }, { stopped: cancelled, progress, label: `Opening ${book.file_name}` });
    let chapterHint = combinedReferenceSubject(book) ? "" : book.chapter;
    const bookSubject = combinedReferenceSubject(book) || book.subject;
    const extracted = await extractPdfText(file, (page, total) => {
      if (savedPages.has(page)) chapterHint = splitReferenceContent(savedPages.get(page) || "").context?.chapter || "";
      progress(`Reading ${book.file_name} · page ${page} of ${total}`);
    }, {
      inspectEveryPage: true,
      cancelled,
      ...(chapter ? { priorityChapter: { subject: bookSubject, chapter }, recognizeIndex: (image: string, nativeText: string) => reader.recognizeContents(image, nativeText) } : {}),
      beforePage: (page, previous) => { if (page !== previous + 1) chapterHint = ""; if (savedPages.has(page)) chapterHint = splitReferenceContent(savedPages.get(page) || "").context?.chapter || ""; },
      savedPages,
      savePage: async (text, page) => {
        if (cancelled()) throw new Error("Reference-book reading paused. Completed pages are saved.");
        if (!savedPages.has(page)) await saveExtractedReferencePage({ data: { book_id: book.id, page, text } });
      },
      recognizePage: async (image, page, aspect, nativeText) => {
        if (cancelled()) throw new Error("Reference-book reading paused. Completed pages are saved.");
        let text = "";
        try { text = await reader.recognize(image, nativeText); }
        catch { progress(`Saving ${book.file_name} · page ${page}; chapter matching needs review.`); }
        const content = await retryBookRead(() => saveCapturedReferencePage({ data: { image, text, page, aspect, book_id: book.id, chapter_hint: chapterHint } }), { stopped: cancelled, progress, label: `${book.file_name} · page ${page}` });
        savedPages.set(page, content);
        const captured = splitReferenceContent(content);
        chapterHint = captured.context?.chapter || "";
        // The server has saved the original page and crop coordinates already.
        // Attach useful images immediately, without waiting for the whole book.
        if (captured.visuals.length && !cancelled()) {
          try { await onPicturesSaved?.(); }
          catch { progress(`Page ${page} saved. Picture preview will refresh after reading; continuing the book.`); }
        }
        return content;
      },
    });
    const completed = await retryBookRead(() => finishReferenceReading({ data: { book_id: book.id, num_pages: extracted.numPages } }), { stopped: cancelled, progress, label: `Saving ${book.file_name}` });
    summaries.push({ book: book.file_name, ...completed });
    progress(`${book.file_name}: ${completed.pages} pages saved without AI credits, ${completed.figures} indexed screenshots across ${completed.chapters} chapters.${completed.unmatchedPages ? ` ${completed.unmatchedPages} pages need chapter review.` : ""}`);
  } catch (error) {
    if (cancelled()) return summaries;
    const message = error instanceof Error ? error.message : String(error);
    summaries.push({ book: book.file_name, pages: 0, figures: 0, chapters: 0, error: message });
    progress(`${book.file_name}: ${message} Completed pages are saved; continuing with the next book.`);
  } } } finally { await reader.close(); }
  return summaries;
}
