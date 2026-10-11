import { supabase } from "@/integrations/supabase/client";
import { combinedReferenceMatches } from "@/lib/reference-books";
import { extractPdfText } from "@/lib/pdf-extract";
import { signDownload } from "@/lib/ingest.functions";
import { readScannedPage, finishReferenceReading, saveExtractedReferencePage } from "@/lib/reference-ocr.functions";

/** Read the existing uploaded scans once, checkpointing each page for resumption. */
export async function prepareScannedReferenceBooks(klass: string, subject: string, progress: (message: string) => void, cancelled: () => boolean = () => false) {
  if (!/11|12/.test(klass)) return;
  const { data: inventory, error } = await supabase.from("ncert_books").select("id,class,subject,chapter,file_name,storage_path,num_pages,num_chunks").or("file_name.ilike.%MED EASY%,file_name.ilike.%MEDEASY%").limit(100);
  if (error) throw new Error(error.message);
  const unique = new Map<string, NonNullable<typeof inventory>[number]>();
  for (const book of inventory || []) {
    if (!combinedReferenceMatches(book, klass, subject)) continue;
    const name = book.file_name.trim().toLowerCase();
    if (!unique.has(name) || (unique.get(name)!.num_chunks || 0) < (book.num_chunks || 0)) unique.set(name, book);
  }
  for (const book of unique.values()) {
    if (cancelled()) return;
    if ((book.num_chunks || 0) >= Math.max(2, (book.num_pages || 0) / 12)) continue;
    progress(`Reading scanned reference notes: ${book.file_name}`);
    const { data: saved, error: savedError } = await supabase.from("ncert_pages").select("page_number,text").eq("book_id", book.id).order("page_number").limit(1000);
    if (savedError) throw new Error(savedError.message);
    const savedPages = new Map((saved || []).filter(page => page.text.startsWith("[SOURCE_OCR_PAGE]\n")).map(page => [page.page_number, page.text.replace(/^\[SOURCE_OCR_PAGE\]\n/, "")]));
    const ticket = await signDownload({ data: { path: book.storage_path } });
    const response = await fetch(ticket.signedUrl);
    if (!response.ok) throw new Error(`Could not read the uploaded ${book.file_name}.`);
    const file = await response.blob();
    const extracted = await extractPdfText(file, (page, total) => progress(`Reading ${book.file_name} · page ${page} of ${total}`), {
      savedPages,
      savePage: async (text, page) => {
        if (cancelled()) throw new Error("Reference-book reading paused. Completed pages are saved.");
        if (!savedPages.has(page)) await saveExtractedReferencePage({ data: { book_id: book.id, page, text } });
      },
      recognizePage: async (image, page) => {
        if (cancelled()) throw new Error("Reference-book reading paused. Completed pages are saved.");
        return readScannedPage({ data: { image, page, book_id: book.id } });
      },
    });
    await finishReferenceReading({ data: { book_id: book.id, num_pages: extracted.numPages } });
  }
}
