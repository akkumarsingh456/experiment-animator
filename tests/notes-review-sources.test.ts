import { describe, it, expect, vi } from "vitest";
import { loadNotesReviewSources } from "@/lib/notes-review-sources.functions";
const f=vi.hoisted(()=>({ids:[] as string[],books:[
  {id:"p12",class:"Class 12",subject:"Physics",chapter:"",file_name:"Physics NCERT.pdf"},
  {id:"p11",class:"Class 11",subject:"Physics",chapter:"",file_name:"Other grade.pdf"},
  {id:"c12",class:"Class 12",subject:"Chemistry",chapter:"",file_name:"Other subject.pdf"},
]}));
vi.mock("@tanstack/react-start",()=>({createServerFn:()=>({inputValidator:(parse:(raw:unknown)=>unknown)=>({handler:(fn:(arg:{data:unknown})=>unknown)=>(arg:{data:unknown})=>fn({data:parse(arg.data)})})})}));
vi.mock("@/lib/lesson-textbooks",()=>({readLessonTextbooks:async()=>f.books}));
vi.mock("@/integrations/supabase/client.server",()=>({supabaseAdmin:{from:()=>{const q={select:()=>q,eq:(_column:string,id:string)=>{f.ids.push(id);return q;},order:()=>q,limit:async()=>({data:[
  {page_number:1,text:"Moving Charges and Magnetism\nThe source sentence belongs to the selected chapter."},
  {page_number:2,text:"Magnetism and Matter\nThis different chapter must not be substituted."},
],error:null})};return q;}}}));
describe("Read-only independent chapter evidence",()=>{
  it("matches exact class and subject and scopes the selected chapter",async()=>{
    f.ids=[];const result=await loadNotesReviewSources({data:{klass:"12",subject:"Physics",chapter:"Chapter 4: Moving Charges and Magnetism"}});
    expect(f.ids).toEqual(["p12"]);expect(result.sources).toHaveLength(1);
    expect(result.sources[0].text).toContain("selected chapter");expect(result.sources[0].text).not.toContain("different chapter");
    expect(result.sources[0].book).toBe("Physics NCERT.pdf");
  });
  it("does not substitute an unknown chapter with whole-book text",async()=>{
    f.ids=[];const result=await loadNotesReviewSources({data:{klass:"12",subject:"Physics",chapter:"Unknown chapter"}});
    expect(result.sources).toEqual([]);expect(f.ids).toEqual([]);
  });
});
