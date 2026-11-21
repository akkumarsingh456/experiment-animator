import { subjectMatches } from "@/lib/generate.functions";

const clean = (value: string) => value.toLowerCase().replace(/\.pdf$/i, "").replace(/^chapter\s*\d+\s*[:.\-]?\s*/i, "").replace(/\([^)]*\)/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const classNumber = (value: string) => value.replace(/\D/g, "");

export async function resolveNcertLessonBook(data: { klass: string; subject: string; chapter: string }) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  // Existing uploaded source books are readable without sign-in or retrospective approval.
  // This is read-only and scoped to the requested class and subject.
  const { data: rows, error } = await db.from("ncert_books")
    .select("id,class,subject,chapter,file_name,storage_path,source_kind")
    .limit(1000);
  if (error) throw new Error("The uploaded textbook library could not be checked: " + error.message);
  const candidates = (rows || []).filter(book =>
    classNumber(String(book.class || "")) === classNumber(data.klass) &&
    subjectMatches(String(book.subject || ""), data.subject, data.klass) &&
    !!book.storage_path
  );
  if (!candidates.length) return null;
  const wanted = clean(data.chapter);
  const exact = candidates.filter(book => clean(String(book.chapter || "")) === wanted || clean(String(book.file_name || "")) === wanted);
  const scored = [...candidates].sort((a,b) => {
    const score = (book: typeof a) => {
      const name = clean(String(book.file_name || ""));
      const chapterName = clean(String(book.chapter || ""));
      return (name.includes(wanted) || chapterName.includes(wanted) ? 100 : 0) +
        (/ncert|textbook|science|chemistry|physics|biology|mathematics/.test(name) ? 10 : 0) +
        (book.source_kind === "ncert" ? 2 : 0);
    };
    return score(b)-score(a);
  });
  const selected = exact[0] || scored[0];
  const { data: stored, error: storedError } = await db.from("ncert_books")
    .select("id,class,subject,chapter,file_name,storage_path")
    .eq("id", selected.id).maybeSingle();
  if (storedError || !stored?.storage_path) return null;
  const signed = await db.storage.from("ncert-pdfs").createSignedUrl(stored.storage_path, 300);
  if (!signed.data?.signedUrl) throw new Error("The uploaded textbook PDF could not be opened.");
  return { id: stored.id as string, name: stored.file_name as string, signedUrl: signed.data.signedUrl };
}
