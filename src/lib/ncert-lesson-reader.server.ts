import { readLessonTextbooks } from "@/lib/lesson-textbooks";
import { subjectMatches } from "@/lib/generate.functions";

const clean = (value: string) => value.toLowerCase().replace(/\.pdf$/i, "").replace(/^chapter\s*\d+\s*[:.\-]?\s*/i, "").replace(/\([^)]*\)/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const classNumber = (value: string) => value.replace(/\D/g, "");

export async function resolveNcertLessonBook(data: { klass: string; subject: string; chapter: string }) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const inventory = await readLessonTextbooks(db);
  const wanted = clean(data.chapter);
  const matches = inventory.filter(book =>
    classNumber(book.class) === classNumber(data.klass) &&
    subjectMatches(book.subject, data.subject, data.klass) &&
    (clean(book.chapter) === wanted || clean(book.file_name) === wanted)
  );
  if (!matches.length) return null;
  // Prefer the most exact chapter-title match; never fall back to another chapter.
  const selected = matches.sort((a,b) =>
    Number(clean(b.chapter) === wanted) - Number(clean(a.chapter) === wanted)
  )[0];
  const { data: stored, error } = await db.from("ncert_books")
    .select("id,class,subject,chapter,file_name,storage_path")
    .eq("id", selected.id).maybeSingle();
  if (error || !stored?.storage_path) return null;
  return { id: stored.id as string, name: stored.file_name as string, storagePath: stored.storage_path as string };
}

