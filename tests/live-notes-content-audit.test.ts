import { it, expect } from "vitest";
import { loadEnvFile } from "node:process";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { readLessonTextbooks } from "@/lib/lesson-textbooks";
import { subjectMatches } from "@/lib/generate.functions";
import { scopeTextbookPages, scopeSocialChapterPages } from "@/lib/lesson-source-scope";
import { chaptersFor } from "@/lib/ncert-syllabus";
import { socialTitle, socialChapterPart } from "@/lib/social-science-chapters";
import { reviewLessonFacts } from "@/lib/notes-factual-review";

// Explicit opt-in only: read existing public sources/cache, never generate or write.
it.runIf(process.env.EDUPLAN_LIVE_CONTENT_REVIEW === "1")("reviews accessible saved lessons against separate saved chapter text", async () => {
  for (const path of [".env", ".env.local"]) try { loadEnvFile(path); } catch { /* Optional local configuration. */ }
  const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await db.from("lesson_cache").select("klass,subject,chapter,slides:result->slides").limit(1000);
  if (error) throw new Error(`Saved lesson review unavailable (${error.code}).`);
  const books = await readLessonTextbooks(db);
  const selected: Record<string, string[]> = { "9":["Social Science","Mathematics","Science","Computer Science"],"10":["Social Science","Mathematics","Science","Computer Science"],"11":["Mathematics","Physics","Chemistry","Computer Science"],"12":["Mathematics","Physics","Chemistry","Computer Science"] };
  const pages = new Map<string, Promise<Array<{page_number:number;text:string}>>>();
  const results = [];
  const checkpoint = () => writeFileSync("outputs/LIVE_NOTES_REVIEW_PROGRESS.json",JSON.stringify({lessonsReviewed:results.length,results},null,2));
  for (const lesson of data || []) {
    const klass=String(lesson.klass).replace(/\D/g, ""), subject=String(lesson.subject), chapter=String(lesson.chapter);
    if (!selected[klass]?.includes(subject) || !Array.isArray(lesson.slides)) continue;
    const titles=chaptersFor(klass,subject), wanted=subject === "Social Science" ? socialChapterPart(chapter)||subject : subject;
    const matching=books.filter(book=>book.class.replace(/\D/g, "")===klass && subjectMatches(book.subject,wanted,klass));
    const chosen=[...new Map(matching.map(book=>[book.file_name.toLowerCase(),book])).values()].slice(0,8);
    const sources=[];
    for (const book of chosen) {
      if (!pages.has(book.id)) pages.set(book.id, (async()=>{
        const result=await db.from("ncert_pages").select("page_number,text").eq("book_id",book.id).order("page_number").limit(1000);
        if(result.error)throw new Error(`Source pages unavailable (${result.error.code}).`);
        if(result.data?.length)return result.data;
        const chunks=await db.from("ncert_chunks").select("chunk_index,content").eq("book_id",book.id).order("chunk_index").limit(1000);
        if(chunks.error)throw new Error(`Source extracts unavailable (${chunks.error.code}).`);
        return (chunks.data||[]).map(row=>({page_number:row.chunk_index,text:row.content}));
      })());
      const records=await pages.get(book.id)!;
      const scoped=subject==="Social Science"?scopeSocialChapterPages(records,socialTitle(chapter),titles.filter(item=>socialChapterPart(item.chapter)===wanted).map(item=>socialTitle(item.chapter))):scopeTextbookPages(records,chapter,titles.map(item=>item.chapter));
      sources.push(...scoped.map((text,index)=>({book:book.file_name,location:`Chapter extract ${index+1}`,text})));
    }
    const review=reviewLessonFacts(lesson.slides as any,sources.slice(0,200));
    results.push({klass,subject,chapter,sourceExtracts:sources.slice(0,200).length,sourceMatches:review.matched,possibleConflicts:review.conflicts,needsReview:review.unreviewed,imageOnly:review.imageOnly,
      conflictDetails:review.claims.filter(claim=>claim.status==="possible-conflict")});
    checkpoint();
  }
  const summary={scope:"Read-only source-wording comparison of accessible saved lesson cache and separate matching uploaded textbooks. Not a factual certification; differences may be legitimate examples. No notes or source records modified.",savedCacheRows:(data||[]).length,lessonsReviewed:results.length,
    sourceMatches:results.reduce((n,row)=>n+row.sourceMatches,0),possibleConflicts:results.reduce((n,row)=>n+row.possibleConflicts,0),needsReview:results.reduce((n,row)=>n+row.needsReview,0),results};
  writeFileSync("outputs/LIVE_NOTES_CONTENT_REVIEW.json", JSON.stringify(summary,null,2)+"\n");
  console.log(JSON.stringify({...summary,results:undefined}));expect(results.length).toBeGreaterThan(0);
}, 240000);
