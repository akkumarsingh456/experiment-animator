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
  const candidates = rows.filter(book =>
    bookMatchesLesson({ class: String(book.class || ""), subject: String(book.subject || ""), file_name: book.file_name, chapter: book.chapter }, data.klass, data.subject) &&
    !!book.storage_path
  );
  if (!candidates.length) return null;
  const wanted = clean(data.chapter);
  const exact = candidates.filter(book => clean(String(book.chapter || "")) === wanted || clean(String(book.file_name || "")) === wanted);
  const scored = [...candidates].sort((a,b) => {
    const score = (book: typeof a) => {
      const name = clean(String(book.file_name || ""));
      const chapterName = clean(String(book.chapter || ""));
      return (name === wanted || chapterName === wanted ? 1000 : name.includes(wanted) || chapterName.includes(wanted) ? 100 : 0) +
        (/ncert|textbook/.test(name) ? 10 : 0) + (book.source_kind === "ncert" ? 2 : 0);
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
  // A chapter-specific upload starts at its first PDF page. For a complete
  // textbook, let the PDF bookmark/native-heading resolver find the chapter;
  // a table-of-contents mention must never be mistaken for the chapter start.
  const chapterPage: number | null = exact.length ? 1 : null;
  const signed = await db.storage.from("ncert-pdfs").createSignedUrl(stored.storage_path, 300);
  if (!signed.data?.signedUrl) throw new Error("The uploaded textbook PDF could not be opened.");
  return { id: stored.id as string, name: stored.file_name as string, signedUrl: signed.data.signedUrl, chapterPage };
}
