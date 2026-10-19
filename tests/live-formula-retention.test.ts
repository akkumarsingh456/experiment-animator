import { it, expect } from "vitest";
import { loadEnvFile } from "node:process";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { withPhysicsDimensions } from "@/lib/physics-dimensions";
import { repairSourceMathSlide } from "@/lib/source-math-repair";
it.runIf(process.env.EDUPLAN_LIVE_FORMULA_RETENTION === "1")("retains every saved dimensional formula in presentation without rewriting caches", async()=>{
  for(const path of [".env",".env.local"])try{loadEnvFile(path);}catch{}
  const db=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
  const {data,error}=await db.from("lesson_cache").select("klass,subject,chapter,slides:result->slides").eq("subject","Physics").limit(1000);
  if(error)throw new Error(`Saved formulas unavailable (${error.code}).`);
  let slidesChecked=0,formulaRows=0;const missing:unknown[]=[];
  for(const lesson of data||[])for(const slide of Array.isArray(lesson.slides)?lesson.slides:[]){
    const original=slide.sections?.filter((section:any)=>section.heading==="MLT Dimensional Formula").flatMap((section:any)=>section.lines)||[];
    if(!original.some((line:string)=>line.split(" | ").length===3||/\$[^$]+\$|\[[^\]]+\]/.test(line)))continue;
    slidesChecked++;formulaRows+=original.length;
    const result=withPhysicsDimensions(repairSourceMathSlide(slide).sections,"Physics",slide.title,true);
    const retained=result.filter(section=>section.heading==="MLT Dimensional Formula").flatMap(section=>section.lines);
    if(JSON.stringify(retained)!==JSON.stringify(original))missing.push({klass:lesson.klass,chapter:lesson.chapter,topic:slide.title});
  }
  const report={scope:"Read-only check of accessible Physics lesson-cache dimensional rows through the presentation helpers. No model calls or database writes.",lessons:(data||[]).length,slidesChecked,formulaRows,missing};
  writeFileSync("outputs/LIVE_FORMULA_RETENTION.json",JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report));
  expect(formulaRows).toBeGreaterThan(0);expect(missing).toEqual([]);
},120000);
