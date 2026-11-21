import { bookMatchesLesson } from "@/lib/generate.functions";
import { isEnglishNcertBookCandidate } from "@/lib/ncert-book-language";

const clean = (value: string) => value.toLowerCase().replace(/\.pdf$/i, "").replace(/^chapter\s*\d+\s*[:.\-]?\s*/i, "").replace(/\([^)]*\)/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

type PageRow = { page_number: number; text: string };
type BookRow = { id: string; class: string; subject: string; chapter: string; file_name: string; storage_path: string; source_kind?: string | null };

function findContentsEntry(pageRows: PageRow[], wanted: string) {
  for (const row of pageRows) {
    const text = String(row.text || "");
    if (!/\b(?:contents|table of contents)\b/i.test(text.slice(0, 1400))) continue;
    const lines = text.split(/\r?\n/).map(line => line.replace(/[.·…]{2,}/g, " ").trim()).filter(Boolean);
    for (let index = 0; index < lines.length; index++) {
      if (wanted.length < 4 || !clean(lines[index]).includes(wanted)) continue;
      for (const candidate of lines.slice(index, Math.min(lines.length, index + 3))) {
        const trailing = candidate.match(/(?:^|\s)(\d{1,3})\s*$/);
        if (trailing && Number(trailing[1]) > 0) return { contentsPage: row.page_number, printedPage: Number(trailing[1]) };
      }
    }
  }
  return { contentsPage: null as number | null, printedPage: null as number | null };
}

async function readBookPages(db: any, bookId: string): Promise<PageRow[]> {
  const rows: PageRow[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await db.from("ncert_pages").select("page_number,text")
      .eq("book_id", bookId).order("page_number", { ascending: true }).range(from, from + 499);
    if (error) return rows;
    rows.push(...((data || []) as PageRow[]));
    if (!data || data.length < 500) break;
  }
  return rows;
}

export async function resolveNcertLessonBook(data: { klass: string; subject: string; chapter: string }) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const rows: BookRow[] = [];
  for (let from = 0; ; from += 500) {
    const { data: batch, error } = await db.from("ncert_books")
      .select("id,class,subject,chapter,file_name,storage_path,source_kind")
      .order("id", { ascending: true }).range(from, from + 499);
    if (error) throw new Error("The uploaded textbook library could not be checked: " + error.message);
    rows.push(...((batch || []) as BookRow[]));
    if (!batch || batch.length < 500) break;
  }

  const requestedSubject = data.subject.trim().toLowerCase();
  const isJuniorScience = Number(data.klass.replace(/\D/g, "")) <= 10 && requestedSubject === "science";
  const candidates = rows.filter(book => {
    if (!book.storage_path || book.source_kind === "reference" || !isEnglishNcertBookCandidate(book)) return false;
    const metadata = { class: String(book.class || ""), subject: String(book.subject || ""), file_name: book.file_name, chapter: book.chapter };
    if (!bookMatchesLesson(metadata, data.klass, data.subject)) return false;
    const identity = String(book.file_name || "") + " " + String(book.chapter || "");
    if (isJuniorScience && /political[_\s-]*science|democratic[_\s-]*politics|social[_\s-]*science|civics|history|geography|economics/i.test(identity)) return false;
    if (requestedSubject === "political science" && /\bscience\b/i.test(String(book.file_name || "").replace(/political[_\s-]*science/ig, ""))) return false;
    return true;
  });
  if (!candidates.length) return null;

  const wanted = clean(data.chapter);
  // Check the extracted contents/index of every eligible volume before selecting.
  // This prevents a valid Part II PDF from winning merely because it was uploaded first.
  const inspected = await Promise.all(candidates.map(async book => {
    const pageRows = await readBookPages(db, book.id);
    const contents = findContentsEntry(pageRows, wanted);
    const chapterRow = pageRows.find(row => {
      const text = String(row.text || "");
      return !/\b(?:contents|table of contents|index)\b/i.test(text.slice(0, 900)) && wanted.length >= 5 && clean(text).includes(wanted);
    });
    const chapterPage = chapterRow && Number.isInteger(chapterRow.page_number) && chapterRow.page_number > 0 ? chapterRow.page_number : null;
    const metadataExact = clean(String(book.chapter || "")) === wanted || clean(String(book.file_name || "")) === wanted;
    const evidenceScore = contents.printedPage ? 10000 : chapterPage ? 6000 : metadataExact ? 3000 : 0;
    return { book, pageRows, contents, chapterPage, evidenceScore };
  }));

  inspected.sort((a, b) => {
    if (b.evidenceScore !== a.evidenceScore) return b.evidenceScore - a.evidenceScore;
    const aPartOne = /(?:part|physics)[ _-]*1(?:\D|$)|(?:^|[_ -])1\.pdf$/i.test(a.book.file_name);
    const bPartOne = /(?:part|physics)[ _-]*1(?:\D|$)|(?:^|[_ -])1\.pdf$/i.test(b.book.file_name);
    if (aPartOne !== bPartOne && /\bphysics\b/i.test(data.subject)) return aPartOne ? -1 : 1;
    return 0;
  });

  const selected = inspected[0];
  const { data: stored, error: storedError } = await db.from("ncert_books")
    .select("id,class,subject,chapter,file_name,storage_path")
    .eq("id", selected.book.id).maybeSingle();
  if (storedError || !stored?.storage_path) return null;

  const signed = await db.storage.from("ncert-pdfs").createSignedUrl(stored.storage_path, 300);
  if (!signed.data?.signedUrl) throw new Error("The uploaded textbook PDF could not be opened.");
  return {
    id: stored.id as string,
    name: stored.file_name as string,
    signedUrl: signed.data.signedUrl,
    chapterPage: selected.chapterPage,
    contentsPage: selected.contents.contentsPage,
    printedPage: selected.contents.printedPage,
  };
}
