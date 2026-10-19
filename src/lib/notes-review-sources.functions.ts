import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { readLessonTextbooks } from "./lesson-textbooks";
import { subjectMatches } from "./generate.functions";
import { chaptersFor } from "./ncert-syllabus";
import { scopeTextbookPages, scopeSocialChapterPages } from "./lesson-source-scope";
import { socialChapterPart, socialTitle } from "./social-science-chapters";
import type { ReviewSource } from "./notes-factual-review";

/** Read-only, separate from generation. No models, writes or source substitution. */
export const loadNotesReviewSources = createServerFn({ method: "POST" }).inputValidator((raw: unknown) => z.object({
  klass: z.enum(["9", "10", "11", "12"]), subject: z.string().min(1).max(80), chapter: z.string().min(1).max(300),
}).parse(raw)).handler(async ({ data }) => {
  const chapters = chaptersFor(data.klass, data.subject);
  if (!chapters.some(chapter => chapter.chapter === data.chapter)) return { sources: [] as ReviewSource[], partial: false };
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const inventory = await readLessonTextbooks(db);
  const wanted = data.subject === "Social Science" ? socialChapterPart(data.chapter) || data.subject : data.subject;
  const matching = inventory.filter(book => book.class.replace(/\D/g, "") === data.klass && subjectMatches(book.subject, wanted, data.klass));
  const unique = [...new Map(matching.map(book => [book.file_name.toLowerCase(), book])).values()];
  let partial = unique.length > 8;
  const sets = await Promise.all(unique.slice(0, 8).map(async book => {
    const { data: pages, error } = await db.from("ncert_pages").select("page_number,text").eq("book_id", book.id).order("page_number").limit(1000);
    if (error) throw new Error("Saved textbook pages could not be read. Retry the source check.");
    let records = pages || [];
    if (records.length === 1000) partial = true;
    if (!records.length) {
      const { data: chunks, error: chunkError } = await db.from("ncert_chunks").select("chunk_index,content").eq("book_id", book.id).order("chunk_index").limit(1000);
      if (chunkError) throw new Error("Saved textbook extracts could not be read.");
      if (chunks?.length === 1000) partial = true;
      records = (chunks || []).map(chunk => ({ page_number: chunk.chunk_index, text: chunk.content }));
    }
    const scoped = data.subject === "Social Science"
      ? scopeSocialChapterPages(records, socialTitle(data.chapter), chapters.filter(chapter => socialChapterPart(chapter.chapter) === wanted).map(chapter => socialTitle(chapter.chapter)))
      : scopeTextbookPages(records, data.chapter, chapters.map(chapter => chapter.chapter));
    return scoped.map((text, index) => ({ book: book.file_name, location: `Chapter extract ${index + 1}`, text }));
  }));
  const all = sets.flat(); if (all.length > 200) partial = true;
  return { sources: all.slice(0, 200), partial };
});
