import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { GenerationResult } from "@/lib/generate.functions";
import { combinedReferenceMatches } from "@/lib/reference-books";
import { splitReferenceContent } from "@/lib/reference-visuals";
import { isContentsListing } from "@/lib/note-source-noise";
import { prosePoints } from "@/lib/note-points";

const normal = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{M}0-9]+/gu, " ").trim();
const stop = new Set(["the", "and", "of", "chapter", "introduction", "properties", "notes", "class", "physics", "chemistry", "biology", "law", "laws", "continued"]);
const topicTerms = (text: string) => [...new Set(normal(text).split(" ").filter(word => word.length >= 3 && !stop.has(word)))];
const topicScore = (title: string, text: string) => {
  const terms = topicTerms(title), words = new Set(normal(text).split(" "));
  const hits = terms.filter(term => words.has(term)).length;
  return terms.length && hits >= Math.min(2, terms.length) ? hits * 3 : 0;
};

/** Append source excerpts to the existing lesson; never rewrite its sections. */
export async function appendUploadedReferenceNotes(result: GenerationResult, db: SupabaseClient<Database>, klass: string, subject: string, chapter: string): Promise<GenerationResult> {
  const detailed = /^(chemistry|physics|biology|botany|zoology)$/i.test(subject) && /^(?:Class\s*)?(11|12)$/i.test(klass);
  const chapterFits = (source?: string) => !source?.trim() || topicScore(chapter, source) > 0;
  const { data: books, error } = await db.from("ncert_books").select("id,class,subject,chapter,file_name,num_chunks,storage_path").limit(500);
  if (error) throw new Error(error.message);
  const unique = new Map<string, NonNullable<typeof books>[number]>();
  for (const book of books || []) {
    const ncert = detailed && /ncert/i.test(book.file_name) && book.class.replace(/[^0-9]/g, "") === klass.replace(/[^0-9]/g, "") && book.subject.toLowerCase() === subject.toLowerCase();
    if (!combinedReferenceMatches(book, klass, subject) && !ncert) continue;
    const name = book.file_name.trim().toLowerCase();
    if (!unique.has(name) || (unique.get(name)!.num_chunks || 0) < (book.num_chunks || 0)) unique.set(name, book);
  }
  const selected = [...unique.values()];
  if (!selected.length) return result.slides.some(slide => slide.reference_visuals?.length) ? { ...result, slides: result.slides.map(slide => slide.reference_visuals?.length ? { ...slide, reference_visuals: [] } : slide) } : result;
  const rows = await Promise.all(selected.map(async book => {
    const { data, error: chunkError } = await db.from("ncert_chunks").select("chunk_index,content").eq("book_id", book.id).order("chunk_index").limit(1000);
    if (chunkError) throw new Error(chunkError.message);
    const parsed = (data || []).map(row => splitReferenceContent(row.content));
    const paragraphs = parsed.filter(row => chapterFits(row.context?.chapter)).flatMap(row => row.text.split(/\n\s*\n/)).map(line => line.trim())
      .filter(line => !isContentsListing(line) && !/^\[SOURCE_OCR_PAGE\]/.test(line))
      .flatMap(prosePoints)
      .filter(line => line.length >= 30 && line.length <= (detailed ? 1800 : 900) && (line.includes("$") || !/(?:\.{3,}|…|·{3,})\s*\d+(?:\s*[-–]\s*\d+)?\s*$/.test(line)));
    return { book, visuals: combinedReferenceMatches(book, klass, subject) ? parsed.flatMap(row => row.visuals.filter(v => Number.isInteger(v.page) && v.page > 0 && v.storage_path === `${book.storage_path}.page-${v.page}.jpg`).map(v => ({ ...v, chapter: v.chapter || row.context?.chapter, book: book.file_name, book_id: book.id }))) : [], paragraphs };

  }));
  const signed = new Map<string, string>();
  const used = new Set<string>();
  // Give each complete book map one home in the chapter, rather than repeating
  // its branches on unrelated slides. Both chapter and topic must match.
  const figureOwners = new Map<string, number>();
  const figureKey = (visual: { storage_path: string; title: string }) => `${visual.storage_path}:${visual.title}`;
  for (const { visuals } of rows) for (const visual of visuals) {
    if (!visual.chapter?.trim() || !chapterFits(visual.chapter)) continue;
    const scores = result.slides.map((slide, index) => ({ index, score: topicScore(slide.title, `${visual.title} ${visual.description}`) }))
      .filter(item => !["break", "mcq"].includes(result.slides[item.index].kind || ""));
    const best = scores.sort((a, b) => b.score - a.score)[0];
    if (best && best.score > 0) figureOwners.set(figureKey(visual), best.index);
  }
  const slides = result.slides.map((slide, slideIndex) => {
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
      return (titleTerms.length && titleHits >= Math.min(2, titleTerms.length)) || (!titleTerms.length && chapterTerms.length && chapterHits >= Math.min(2, chapterTerms.length)) ? titleHits * 3 + chapterHits : 0;
    };
    if (!terms.length) return slide;
    // Refresh only supplemental reference sections, including lessons from the
    // cache. The approved original notes, formulas and derivations retain identity.
    const headings = new Set(rows.map(({ book }) => `Reference notes — ${book.file_name.replace(/\.pdf$/i, "").trim()}`));
    const originalSections = (slide.sections || []).filter(section => !headings.has(section.heading));
    const existing = new Set(originalSections.flatMap(section => section.lines.flatMap(prosePoints)).map(normal));
    const extra = rows.flatMap(({ book, paragraphs }) => {
      const heading = `Reference notes — ${book.file_name.replace(/\.pdf$/i, "").trim()}`;
      const lines = [...new Set(paragraphs)].map(line => ({ line, score: relevance(line) }))
        .filter(row => row.score > 0 && !existing.has(normal(row.line)))
        .sort((a, b) => b.score - a.score).slice(0, detailed ? 10 : 4).map(row => row.line);
      if (!lines.length) return [];
      used.add(book.id);
      return [{ heading, kind: "bullets" as const, lines }];
    });
    const candidates = detailed ? rows.flatMap(({ book, visuals }) => visuals.filter(visual => figureOwners.get(figureKey(visual)) === slideIndex).map(visual => { used.add(book.id); return visual; })) : [];
    const figures = candidates.filter((v,i,all) => all.findIndex(other => other.storage_path === v.storage_path && other.title === v.title) === i);
    return extra.length || figures.length || (slide.reference_visuals || []).length || originalSections.length !== (slide.sections || []).length ? { ...slide, sections: [...originalSections, ...extra], reference_visuals: figures.map(figure => ({ ...figure })) } : slide;
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
