import { bookMatchesLesson } from "@/lib/generate.functions";

const clean = (value: string) => value.toLowerCase().replace(/\.pdf$/i, "").replace(/^chapter\s*\d+\s*[:.\-]?\s*/i, "").replace(/\([^)]*\)/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export async function resolveNcertLessonBook(data: { klass: string; subject: string; chapter: string }) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  // Read the complete existing uploaded-book inventory. The source library is
  // read-only for visitors; no upload, relabelling or metadata changes occur.
  const rows: any[] = [];
  for (let from = 0; ; from += 500) {
    const { data: batch, error } = await db.from("ncert_books")
      .select("id,class,subject,chapter,file_name,storage_path,source_kind")
      .order("id", { ascending: true }).range(from, from + 499);
    if (error) throw new Error("The uploaded textbook library could not be checked: " + error.message);
    rows.push(...(batch || []));
    if (!batch || batch.length < 500) break;
  }
  const requestedSubject = data.subject.trim().toLowerCase();
  const isJuniorScience = Number(data.klass.replace(/\D/g, "")) <= 10 && requestedSubject === "science";
  const candidates = rows.filter(book => {
    if (!book.storage_path) return false;
    const metadata = { class: String(book.class || ""), subject: String(book.subject || ""), file_name: book.file_name, chapter: book.chapter };
    if (!bookMatchesLesson(metadata, data.klass, data.subject)) return false;
    // Some older uploads have an incorrect subject dropdown value. Never let
    // a filename/chapter that explicitly identifies another subject override
    // the class + subject chosen in Prepare your NCERT lesson.
    const identity = String(book.file_name || "") + " " + String(book.chapter || "");
    if (isJuniorScience && /political[_\s-]*science|democratic[_\s-]*politics|social[_\s-]*science|civics|history|geography|economics/i.test(identity)) return false;
    if (requestedSubject === "political science" && /\bscience\b/i.test(String(book.file_name || "").replace(/political[_\s-]*science/ig, ""))) return false;
    return true;
  });
  if (!candidates.length) return null;
  const wanted = clean(data.chapter);
  const exact = candidates.filter(book => clean(String(book.chapter || "")) === wanted || clean(String(book.file_name || "")) === wanted);
  const scored = [...candidates].sort((a,b) => {
    const score = (book: typeof a) => {
      const name = clean(String(book.file_name || ""));
      const chapterName = clean(String(book.chapter || ""));
      const chapterMatch = chapterName === wanted ? 5000 : chapterName.includes(wanted) ? 2500 : name.includes(wanted) ? 1800 : 0;
      return chapterMatch + (/ncert|textbook/.test(name) ? 10 : 0) + (book.source_kind === "ncert" ? 2 : 0);
    };
    return score(b)-score(a);
  });
  // An exact chapter upload wins; otherwise open a matching complete volume.
  // Never substitute a PDF from another class or subject.
  const selected = exact[0] || scored[0];
  const { data: stored, error: storedError } = await db.from("ncert_books")
    .select("id,class,subject,chapter,file_name,storage_path")
    .eq("id", selected.id).maybeSingle();
  if (storedError || !stored?.storage_path) return null;
  // Read the extracted pages for this exact uploaded book and use its
  // contents/table-of-contents entry as the primary chapter-page map.
  const pageRows: { page_number: number; text: string }[] = [];
  for (let from = 0; ; from += 500) {
    const { data: batch, error } = await db.from("ncert_pages")
      .select("page_number,text").eq("book_id", stored.id)
      .order("page_number", { ascending: true }).range(from, from + 499);
    if (error) break; // Older uploads may not have an extracted page index.
    pageRows.push(...(batch || []));
    if (!batch || batch.length < 500) break;
  }

  const wanted = clean(data.chapter);
  let contentsPage: number | null = null;
  let printedPage: number | null = null;
  const isContents = (text: string) => /\b(?:contents|table of contents)\b/i.test(text.slice(0, 900));
  const pageEntry = (text: string) => {
    const lines = text.split(/\r?\n/).map(line => line.replace(/[.·…]{2,}/g, " ").trim()).filter(Boolean);
    for (let index = 0; index < lines.length; index++) {
      const normalized = clean(lines[index]);
      const titleMatch = wanted.length > 4 && normalized.includes(wanted);
      if (!titleMatch) continue;
      // Page numbers may be on the same line or on the immediately following
      // line after PDF text extraction has split a contents entry.
      for (const candidate of lines.slice(index, Math.min(lines.length, index + 3))) {
        const trailing = candidate.match(/(?:^|\s)(\d{1,3})\s*$/);
        if (trailing) {
          const value = Number(trailing[1]);
          if (value > 0) return value;
        }
      }
    }
    return null;
  };
  for (const row of pageRows) {
    const text = String(row.text || "");
    if (!isContents(text)) continue;
    const foundPage = pageEntry(text);
    if (foundPage) {
      contentsPage = row.page_number;
      printedPage = foundPage;
      break;
    }
  }

  // If the contents page is unavailable, use the actual extracted chapter
  // heading as a fallback. Never use the contents entry itself as the reader page.
  let chapterPage: number | null = null;
  if (!printedPage && wanted.length >= 5) {
    const match = pageRows.find(row => {
      const text = String(row.text || "");
      return !isContents(text) && !/\bindex\b/i.test(text.slice(0, 300)) && clean(text).includes(wanted);
    });
    if (match && Number.isInteger(match.page_number) && match.page_number > 0) chapterPage = match.page_number;
  }
  const signed = await db.storage.from("ncert-pdfs").createSignedUrl(stored.storage_path, 300);
  if (!signed.data?.signedUrl) throw new Error("The uploaded textbook PDF could not be opened.");
  return { id: stored.id as string, name: stored.file_name as string, signedUrl: signed.data.signedUrl, chapterPage, contentsPage, printedPage };
}
