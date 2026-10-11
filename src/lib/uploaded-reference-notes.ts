import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { GenerationResult } from "@/lib/generate.functions";
import { combinedReferenceMatches } from "@/lib/reference-books";
import { splitReferenceContent } from "@/lib/reference-visuals";
import { isContentsListing } from "@/lib/note-source-noise";

const normal = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{M}0-9]+/gu, " ").trim();
const stop = new Set(["the", "and", "of", "chapter", "introduction", "properties", "notes", "class", "physics", "chemistry", "biology"]);

/** Append source excerpts to the existing lesson; never rewrite its sections. */
export async function appendUploadedReferenceNotes(result: GenerationResult, db: SupabaseClient<Database>, klass: string, subject: string, chapter: string): Promise<GenerationResult> {
  const detailed = /^(chemistry|physics)$/i.test(subject) && /^(?:Class\s*)?(11|12)$/i.test(klass);
  const { data: books, error } = await db.from("ncert_books").select("id,class,subject,chapter,file_name,num_chunks").limit(500);
  if (error) throw new Error(error.message);
  const unique = new Map<string, NonNullable<typeof books>[number]>();
  for (const book of books || []) {
    const ncert = detailed && /ncert/i.test(book.file_name) && book.class.replace(/[^0-9]/g, "") === klass.replace(/[^0-9]/g, "") && book.subject.toLowerCase() === subject.toLowerCase();
    if (!combinedReferenceMatches(book, klass, subject) && !ncert) continue;
    const name = book.file_name.trim().toLowerCase();
    if (!unique.has(name) || (unique.get(name)!.num_chunks || 0) < (book.num_chunks || 0)) unique.set(name, book);
  }
  const selected = [...unique.values()];
  if (!selected.length) return result;
  const rows = await Promise.all(selected.map(async book => {
    const { data, error: chunkError } = await db.from("ncert_chunks").select("chunk_index,content").eq("book_id", book.id).order("chunk_index").limit(1000);
    if (chunkError) throw new Error(chunkError.message);
    const parsed = (data || []).map(row => splitReferenceContent(row.content));
    return { book, visuals: parsed.flatMap(row => row.visuals.map(v => ({ ...v, book: book.file_name, book_id: book.id }))), paragraphs: parsed.flatMap(row => row.text.split(/\n\s*\n/)).map(line => line.trim()).filter(line => line.length >= 30 && line.length <= (detailed ? 1800 : 900) && !isContentsListing(line) && !/^\[SOURCE_OCR_PAGE\]/.test(line) && (line.includes("$") || !/(?:\.{3,}|…|·{3,})\s*\d+(?:\s*[-–]\s*\d+)?\s*$/.test(line))) };

  }));
  const signed = new Map<string, string>();
  const used = new Set<string>();
  const slides = result.slides.map(slide => {
    if (slide.kind === "break" || slide.kind === "mcq") return slide;
    const titleTerms = [...new Set(normal(slide.title).split(" ").filter(word => word.length >= 3 && !stop.has(word)))];
    const chapterTerms = [...new Set(normal(chapter).split(" ").filter(word => word.length >= 3 && !stop.has(word)))];
    const terms = [...new Set([...titleTerms, ...chapterTerms])];
    const relevance = (text: string) => {
      if (!detailed) {
        const legacyTerms = [...new Set(normal(`${slide.title} ${chapter}`).split(" ").filter(word => word.length > 3 && !stop.has(word)))];
        const hits = legacyTerms.filter(term => normal(text).split(" ").includes(term)).length;
        return hits >= Math.min(2, legacyTerms.length) ? hits : 0;
      }
      const words = new Set(normal(text).split(" "));
      const titleHits = titleTerms.filter(term => words.has(term)).length;
      const chapterHits = chapterTerms.filter(term => words.has(term)).length;
      return titleHits || (!titleTerms.length && chapterHits >= Math.min(2, chapterTerms.length)) ? titleHits * 3 + chapterHits : 0;
    };
    if (!terms.length) return slide;
    const extra = rows.flatMap(({ book, paragraphs }) => {
      const heading = `Reference notes — ${book.file_name.replace(/\.pdf$/i, "").trim()}`;
      if (slide.sections?.some(section => section.heading === heading)) { used.add(book.id); if (!detailed) return []; }
      const existing = new Set(slide.sections?.flatMap(section => section.lines).map(normal));
      const lines = [...new Set(paragraphs)].map(line => ({ line, score: relevance(line) }))
        .filter(row => row.score > 0 && !existing.has(normal(row.line)))
        .sort((a, b) => b.score - a.score).slice(0, detailed ? 10 : 4).map(row => row.line);
      if (!lines.length) return [];
      used.add(book.id);
      return [{ heading, kind: "bullets" as const, lines }];
    });
    const candidates = detailed ? rows.flatMap(({ book, visuals }) => visuals.map(visual => ({ visual, book, score: relevance(`${visual.title} ${visual.description}`) })))
      .filter(item => item.score > 0).sort((a,b) => b.score - a.score).slice(0, 8).map(item => { used.add(item.book.id); return item.visual; }) : [];
    const figures = [...(slide.reference_visuals || []), ...candidates].filter((v,i,all) => all.findIndex(other => other.storage_path === v.storage_path && other.title === v.title) === i);
    return extra.length || figures.length ? { ...slide, sections: [...(slide.sections || []), ...extra], reference_visuals: figures.map(figure => ({ ...figure })) } : slide;
  });
  const paths = [...new Set(slides.flatMap(slide => (slide.reference_visuals || []).map(figure => figure.storage_path)))];
  for (let start = 0; start < paths.length; start += 8) {
    await Promise.all(paths.slice(start, start + 8).map(async path => {
      const { data } = await db.storage.from("ncert-pdfs").createSignedUrl(path, 7200);
      if (data?.signedUrl) signed.set(path, data.signedUrl);
    }));
  }
  for (const slide of slides) for (const figure of slide.reference_visuals || []) figure.url = signed.get(figure.storage_path);
  return { ...result, slides, source_books: [...result.source_books, ...selected.filter(book => used.has(book.id) && !result.source_books.some(existing => existing.id === book.id)).map(({ id, chapter, class: klass, subject }) => ({ id, chapter, class: klass, subject }))] };
}
