import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
/** Read-only, separate from generation. No models, writes or source substitution. */
export const loadNotesReviewSources = createServerFn({ method: "POST" }).inputValidator((raw: unknown) => z.object({
 klass: z.enum(["9", "10", "11", "12"]), subject: z.string().min(1).max(80), chapter: z.string().min(1).max(300),
}).parse(raw)).handler(async ({data})=>{
 const {readSavedChapterSources}=await import('./saved-chapter-sources.server');
 return readSavedChapterSources(data);
});
