import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { GenerationResult } from "@/lib/generate.functions";
import { indexLocalBookPage } from "@/lib/local-book-index";
import { screenshotBookMatches, combinedReferenceSubject } from "@/lib/reference-books";
import { splitReferenceContent } from "@/lib/reference-visuals";

const normal = (text: string) => text.toLowerCase().replace(/[’']s\b/g, "").replace(/[^\p{L}\p{M}0-9]+/gu, " ").trim();
const stop = new Set(["the", "and", "of", "chapter", "introduction", "properties", "notes", "class", "physics", "chemistry", "biology", "law", "laws", "continued", "chemical", "preparation", "important", "points", "example", "examples", "this", "that", "with", "from", "which", "have", "their", "these", "those", "also", "are", "for", "into", "when", "than", "can", "will", "under", "between", "formula", "relation", "original", "source", "page", "diagram", "structure", "book"]);
const topicTerms = (text: string) => [...new Set(normal(text).split(" ").filter(word => word.length >= 3 && !stop.has(word)))];
const topicScore = (title: string, text: string) => {
  const terms = topicTerms(title), words = new Set(normal(text).split(" "));
  const hits = terms.filter(term => words.has(term)).length;
  return terms.length && hits >= Math.min(2, terms.length) ? hits * 3 : 0;
};

/** Attach original Med Easy captures; never use OCR paragraphs as picture substitutes. */
export async function appendUploadedReferenceNotes(result: GenerationResult, db: SupabaseClient<Database>, klass: string, subject: string, chapter: string): Promise<GenerationResult> {
  // Keep significant short names such as s-block / p-block distinct. Loose
  // keyword overlap can otherwise attach a different chapter's diagrams.
  const chapterKeys = new Map<string, string>();
  const chapterKey = (value: string) => {
    if (!chapterKeys.has(value)) chapterKeys.set(value, normal(indexLocalBookPage(subject, value).chapter || value).split(" ").filter(word => word && !/^(?:chapter|the|and|of|[0-9]+)$/.test(word)).join(" "));
    return chapterKeys.get(value) || "";
  };
  const requestedChapter = chapterKey(chapter);
  const chapterFits = (source?: string) => !!requestedChapter && !!source?.trim() && requestedChapter === chapterKey(source);
  const { data: books, error } = await db.from("ncert_books").select("id,class,subject,chapter,file_name,num_chunks,storage_path").limit(1000);
  if (error) throw new Error(error.message);
  if (books?.length === 1000) {
    for (let from = 1000; ; from += 1000) {
      const { data: extra, error: extraError } = await db.from("ncert_books").select("id,class,subject,chapter,file_name,num_chunks,storage_path").range(from, from + 999);
      if (extraError) throw new Error(extraError.message);
      books.push(...(extra || []));
      if (!extra || extra.length < 1000) break;
    }
  }
  const selected = (books || []).filter(book => screenshotBookMatches(book, klass, subject));
  // Remove only sections created by the retired raw-reference importer. Core
  // Teacher Notes, formulas, derivations and their original objects stay intact.
  const loadedRows = await Promise.all(selected.map(async book => {
    const combined = !!combinedReferenceSubject(book);
    const { data, error: chunkError } = await db.from(combined ? "ncert_chunks" : "ncert_pages").select(combined ? "chunk_index,content" : "page_number,text").eq("book_id", book.id).order(combined ? "chunk_index" : "page_number").limit(1000);
    if (chunkError) throw new Error(chunkError.message);
    if (data?.length === 1000) {
      for (let from = 1000; ; from += 1000) {
        const { data: extra, error: extraError } = await db.from(combined ? "ncert_chunks" : "ncert_pages").select(combined ? "chunk_index,content" : "page_number,text").eq("book_id", book.id).order(combined ? "chunk_index" : "page_number").range(from, from + 999);
        if (extraError) throw new Error(extraError.message);
        data.push(...(extra || []));
        if (!extra || extra.length < 1000) break;
      }
    }
    const parsed = (data || []).map(row => splitReferenceContent((row as unknown as {content?: string; text?: string}).content || (row as unknown as {text?: string}).text || ""));
    return { book, visuals: parsed.flatMap(row => row.visuals.filter(v => Number.isInteger(v.page) && v.page > 0 && v.storage_path === `${book.storage_path}.page-${v.page}.jpg`).map(v => ({ ...v, chapter: v.chapter || row.context?.chapter, book: book.file_name, book_id: book.id }))) };

  }));
  // Book counters are finalised only after reading finishes. Prefer actual saved
  // figures over an empty duplicate with the same filename and stale counters.
  const uniqueRows = new Map<string, typeof loadedRows[number]>();
  for (const row of loadedRows) {
    const key = `${row.book.class}|${row.book.subject}|${row.book.file_name.trim().toLowerCase()}`;
    const current = uniqueRows.get(key);
    if (!current || row.visuals.length > current.visuals.length) uniqueRows.set(key, row);
  }
  const rows = [...uniqueRows.values()];
  const signed = new Map<string, string>();
  const used = new Set<string>();
  // Give each complete book map one home in the chapter, rather than repeating
  // its branches on unrelated slides. Both chapter and topic must match.
  const figureOwners = new Map<string, Set<number>>();
  const figureKey = (visual: { storage_path: string; title: string }) => `${visual.storage_path}:${visual.title}`;
  for (const { visuals } of rows) for (const visual of visuals) {
    if (!visual.chapter?.trim() || !chapterFits(visual.chapter)) continue;
    const scores = result.slides.map((slide, index) => {
      const direct = topicScore(slide.title, visual.capture === "page" ? visual.match_text || "" : `${visual.title} ${visual.description}`);
      // Generic slide headings still contain specific topic evidence in their
      // approved notes. Match the picture's subject, never chapter keywords alone.
      const pictureTopic = visual.title.replace(/\b(?:reaction|reactions|map|pathways|diagram|structure|properties|chemical|preparation|comparison)\b/gi, " ");
      const evidence = [...(slide.key_terms || []), ...(slide.notes || []), ...(slide.bullets || []), ...(slide.sections || []).filter(section => !section.heading.startsWith("Reference notes")).flatMap(section => section.lines)].join(" ");
      // Full pages use their OCR solely as an index. Generic headings such as
      // "Important points" can still match specific vocabulary in approved notes.
      const chapterWords = new Set(topicTerms(chapter));
      const evidenceTerms = topicTerms(evidence).filter(term => !chapterWords.has(term));
      const pageWords = new Set(topicTerms(visual.match_text || ""));
      const overlap = evidenceTerms.filter(term => pageWords.has(term));
      const bodyScore = visual.capture === "page"
        ? (overlap.length >= 3 ? overlap.length : 0)
        : topicTerms(pictureTopic).length ? topicScore(pictureTopic, evidence) : 0;
      return { index, score: direct * 10 + bodyScore };
    })
      .filter(item => !["break", "mcq"].includes(result.slides[item.index].kind || ""));
    const best = scores.sort((a, b) => b.score - a.score)[0];
    // A full source page can contain several genuinely different topics. Keep
    // complete cropped maps at one home, but share a page with every matched topic.
    if (visual.capture === "page") {
      const matches = scores.filter(item => item.score > 0).map(item => item.index);
      if (matches.length) figureOwners.set(figureKey(visual), new Set(matches));
    } else if (best && best.score > 0) figureOwners.set(figureKey(visual), new Set([best.index]));
  }
  const slides = result.slides.map((slide, slideIndex) => {
    if (slide.kind === "break" || slide.kind === "mcq") return slide;
    const candidates = rows.flatMap(({ book, visuals }) => visuals.filter(visual => figureOwners.get(figureKey(visual))?.has(slideIndex)).map(visual => { used.add(book.id); return visual; }));
    const figures = candidates.filter((v,i,all) => all.findIndex(other => other.storage_path === v.storage_path && other.title === v.title) === i);
    return figures.length || (slide.reference_visuals || []).length ? { ...slide, reference_visuals: figures.map(figure => ({ ...figure })) } : slide;
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
