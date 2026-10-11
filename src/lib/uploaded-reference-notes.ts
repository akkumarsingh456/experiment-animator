import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { GenerationResult } from "@/lib/generate.functions";
import { combinedReferenceMatches } from "@/lib/reference-books";
import { isContentsListing } from "@/lib/note-source-noise";

const normal = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{M}0-9]+/gu, " ").trim();
const stop = new Set(["the", "and", "of", "chapter", "introduction", "properties", "notes", "class", "physics", "chemistry", "biology"]);

/** Append source excerpts to the existing lesson; never rewrite its sections. */
export async function appendUploadedReferenceNotes(result: GenerationResult, db: SupabaseClient<Database>, klass: string, subject: string, chapter: string): Promise<GenerationResult> {
  const { data: books, error } = await db.from("ncert_books").select("id,class,subject,chapter,file_name,num_chunks").or("file_name.ilike.%MED EASY%,file_name.ilike.%MEDEASY%").limit(100);
  if (error) throw new Error(error.message);
  const unique = new Map<string, NonNullable<typeof books>[number]>();
  for (const book of books || []) {
    if (!combinedReferenceMatches(book, klass, subject)) continue;
    const name = book.file_name.trim().toLowerCase();
    if (!unique.has(name) || (unique.get(name)!.num_chunks || 0) < (book.num_chunks || 0)) unique.set(name, book);
  }
  const selected = [...unique.values()];
  if (!selected.length) return result;
  const rows = await Promise.all(selected.map(async book => {
    const { data, error: chunkError } = await db.from("ncert_chunks").select("chunk_index,content").eq("book_id", book.id).order("chunk_index").limit(1000);
    if (chunkError) throw new Error(chunkError.message);
    return { book, paragraphs: (data || []).flatMap(row => row.content.split(/\n\s*\n/)).map(line => line.trim()).filter(line => line.length >= 30 && line.length <= 900 && !isContentsListing(line) && !/^\[SOURCE_OCR_PAGE\]/.test(line) && (line.includes("$") || !/(?:\.{3,}|…|·{3,})\s*\d+(?:\s*[-–]\s*\d+)?\s*$/.test(line))) };
  }));
  const used = new Set<string>();
  const slides = result.slides.map(slide => {
    if (slide.kind === "break" || slide.kind === "mcq") return slide;
    const terms = [...new Set(normal(`${slide.title} ${chapter}`).split(" ").filter(word => word.length > 3 && !stop.has(word)))];
    if (!terms.length) return slide;
    const extra = rows.flatMap(({ book, paragraphs }) => {
      const heading = `Reference notes — ${book.file_name.replace(/\.pdf$/i, "").trim()}`;
      if (slide.sections?.some(section => section.heading === heading)) { used.add(book.id); return []; }
      const existing = new Set(slide.sections?.flatMap(section => section.lines).map(normal));
      const lines = [...new Set(paragraphs)].map(line => ({ line, score: terms.filter(term => normal(line).split(" ").includes(term)).length }))
        .filter(row => row.score >= Math.min(2, terms.length) && !existing.has(normal(row.line)))
        .sort((a, b) => b.score - a.score).slice(0, 4).map(row => row.line);
      if (!lines.length) return [];
      used.add(book.id);
      return [{ heading, kind: "bullets" as const, lines }];
    });
    return extra.length ? { ...slide, sections: [...(slide.sections || []), ...extra] } : slide;
  });
  return { ...result, slides, source_books: [...result.source_books, ...selected.filter(book => used.has(book.id) && !result.source_books.some(existing => existing.id === book.id)).map(({ id, chapter, class: klass, subject }) => ({ id, chapter, class: klass, subject }))] };
}
