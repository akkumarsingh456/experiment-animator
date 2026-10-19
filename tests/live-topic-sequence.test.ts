import { it, expect } from "vitest";
import { loadEnvFile } from "node:process";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { orderTopicSections } from "@/lib/topic-lecture-order";
it.runIf(process.env.EDUPLAN_LIVE_TOPIC_SEQUENCE === "1")("preserves all stored section rows through per-topic rearrangement",async()=>{
  for(const path of [".env",".env.local"])try{loadEnvFile(path);}catch{}
  const db=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
  const {data,error}=await db.from("lesson_cache").select("klass,subject,chapter,slides:result->slides").limit(1000);
  if(error)throw new Error(`Saved topic review unavailable (${error.code}).`);
  let topics=0,rows=0;const missing:unknown[]=[];
  for(const lesson of data||[])for(const slide of Array.isArray(lesson.slides)?lesson.slides:[]){
    if(slide.teacher_pdf||slide.kind==="mcq"||slide.kind==="break"||!slide.sections?.length)continue;
    const original=JSON.stringify(slide),sections=slide.sections;
    const before=sections.flatMap((item:any)=>item.lines).slice().sort();
    const after=orderTopicSections(sections).flatMap(item=>item.lines).slice().sort();
    topics++;rows+=before.length;
    if(JSON.stringify(before)!==JSON.stringify(after)||JSON.stringify(slide)!==original)missing.push({klass:lesson.klass,subject:lesson.subject,chapter:lesson.chapter,topic:slide.title});
  }
  const report={scope:"Read-only live saved-section line-multiset/immutability check for the separate topic ordering step. No generation or database writes.",cachedLessons:(data||[]).length,topics,rows,missing};
  writeFileSync("outputs/LIVE_TOPIC_SEQUENCE_RETENTION.json",JSON.stringify(report,null,2)+"\n");expect(topics).toBeGreaterThan(0);expect(missing).toEqual([]);
},120000);
