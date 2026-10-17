import { socialNotesPresentationSlide, cleanSocialNoteText } from "@/lib/social-note-presentation";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@/integrations/supabase/types";
import type {GenerationResult,Slide} from "@/lib/generate.functions";
import {socialRevisionChapter,socialKey,socialTitle,SOCIAL_REFERENCE_PATTERN,socialBookSubject,socialRevisionPageMatches,SOCIAL_SCIENCE_CHAPTERS} from "@/lib/social-science-chapters";
import {splitReferenceContent} from "@/lib/reference-visuals";
import {cleanSourceNoteLine,hasBrokenSourceMath} from "@/lib/source-note-quality";

/** Append supplied teacher text verbatim; never rewrite NCERT or fabricate missing pages. */
export async function appendSocialRevisionNotes(result:GenerationResult,db:SupabaseClient<Database>,klass:string,subject:string,chapter:string):Promise<GenerationResult>{
 if(subject!=="Social Science"||!["9","10"].includes(klass.replace(/[^0-9]/g,"")))return result;
 const target=socialKey(socialTitle(chapter));
 if(!target)return result;
 const books:Array<Pick<Database["public"]["Tables"]["ncert_books"]["Row"],"id"|"class"|"subject"|"chapter"|"file_name"|"storage_path"|"num_pages"|"num_chunks">>=[];
 for(let offset=0;;offset+=1000){
  const {data,error}=await db.from("ncert_books").select("id,class,subject,chapter,file_name,storage_path,num_pages,num_chunks").order("id").range(offset,offset+999);
  if(error)throw new Error("Teacher revision PDFs could not be checked. Please retry.");
  books.push(...(data||[]));if(!data||data.length<1000)break;
 }
 const unique=new Map<string,typeof books[number]>();
 for(const book of books){
  const named=socialRevisionChapter(book);
  const recoveredGrade=named&&SOCIAL_SCIENCE_CHAPTERS["10"].some(row=>row.chapter===named)?"10":book.class.replace(/[^0-9]/g,"");
  if(recoveredGrade!==klass.replace(/[^0-9]/g,""))continue;
  // Prefer the chapter PDFs filed under the correct class over duplicate legacy imports.
  if(book.class.replace(/[^0-9]/g,"")!==recoveredGrade && books.some(other=>other.class.replace(/[^0-9]/g,"")===recoveredGrade&&socialRevisionChapter(other)===named))continue;
  if(named ? socialKey(socialTitle(named))!==target : !(SOCIAL_REFERENCE_PATTERN.test(book.file_name)&&socialBookSubject(book)==="Social Science"))continue;
  const key=socialKey(book.file_name.replace(/\(\s*\d+\s*\)/g,"")),prior=unique.get(key);
  if(!prior||(book.num_pages||0)+(book.num_chunks||0)>(prior.num_pages||0)+(prior.num_chunks||0))unique.set(key,book);
 }
 const additions:Slide[]=[];
 for(const book of unique.values()){
  let pages:Array<{page:number;text:string}>=[];
  for(let offset=0;;offset+=1000){
   const {data,error}=await db.from("ncert_pages").select("page_number,text").eq("book_id",book.id).order("page_number").range(offset,offset+999);
   if(error)throw new Error(`Teacher notes could not be read: ${book.file_name}`);
   pages.push(...(data||[]).map(row=>({page:row.page_number,text:row.text})));
   if(!data||data.length<1000)break;
  }
  const chapterSpecific=!!socialRevisionChapter(book);
  if(!chapterSpecific){pages=pages.filter(page=>socialRevisionPageMatches(splitReferenceContent(page.text).text,chapter,klass.replace(/[^0-9]/g,"")));if(!pages.length)continue;}
  const imagePages=chapterSpecific?Array.from({length:book.num_pages||0},(_,i)=>i+1):pages.map(page=>page.page);
  if(!pages.some(page=>splitReferenceContent(page.text).text.trim())){
   pages=[];
   for(let offset=0;;offset+=1000){
    const {data,error}=await db.from("ncert_chunks").select("chunk_index,content").eq("book_id",book.id).order("chunk_index").range(offset,offset+999);
    if(error)throw new Error(`Teacher notes could not be read: ${book.file_name}`);
    // Chunk numbers are explicitly labelled as text segments, never invented PDF page numbers.
    pages.push(...(data||[]).map(row=>({page:-(row.chunk_index+1),text:row.content})));
    if(!data||data.length<1000)break;
   }
  }
  // Preserve the actual teacher layouts, including scanned notes with no text layer.
  for(const page of imagePages)additions.push({title:`${socialTitle(chapter)} — original teacher PDF`,kind:"content",visual:"book",bullets:[],notes:[],key_terms:[],sections:[{heading:"Book structure and explanation",kind:"text",lines:[`${book.file_name} · PDF page ${page}`]}],caption:`Uploaded teacher PDF · ${book.file_name} · PDF page ${page}`,teacher_revision:{book_id:book.id,file_name:book.file_name,page},teacher_pdf:{path:book.storage_path,page,file_name:book.file_name}});
  const authorEvidence=book.file_name+" "+pages.map(page=>splitReferenceContent(page.text).text).join(" ");
  const attribution=/shobhit\s*nirwan/i.test(authorEvidence)?"Shobhit Nirwan — uploaded teacher notes":/oswaal/i.test(authorEvidence)?"Oswaal — uploaded revision material":/shubham\s*pathak/i.test(authorEvidence)?"Shubham Pathak — uploaded teacher notes":"Uploaded teacher notes — author not independently verified";
  const readable=pages.filter(page=>splitReferenceContent(page.text).text.trim());
  if(!readable.length){
   additions.push({title:`Teacher revision PDF — ${socialTitle(chapter)}`,kind:"content",visual:"book",bullets:[],notes:[],key_terms:[],sections:[{heading:"Uploaded teacher PDF",kind:"text",lines:[`${attribution}. Source: ${book.file_name}. No readable text has been saved for this PDF. The original PDF pages are included in this presentation; their text has not been reconstructed. No content has been invented.`]}],caption:`Teacher PDF: ${book.file_name}`,teacher_revision:{book_id:book.id,file_name:book.file_name}});continue;
  }
  for(const page of readable){
   const parsed=splitReferenceContent(page.text);
   const original=parsed.text.split(/\n\s*\n|\r?\n/).map(line=>line.trim()).filter(Boolean);
   const good:string[]=[],review:string[]=[];
   for(const line of original){const clean=cleanSocialNoteText(cleanSourceNoteLine(line));if(clean&&!hasBrokenSourceMath(line))good.push(clean);if(!clean||clean!==line||hasBrokenSourceMath(line))review.push(line);}
   const label=page.page>0?`PDF page ${page.page}`:`Saved text segment ${-page.page}`;
   const sections:NonNullable<Slide["sections"]>=[{heading:"Teacher revision source",kind:"text",lines:[`${attribution}. ${book.file_name} · ${label}. This supplement is separate from the NCERT textbook notes.`]}];
   if(!good.some(line=>line.length>=35 && /[a-z]{3}/i.test(line)))continue;
   if(good.length)sections.push({heading:"Teacher revision notes",kind:"bullets",lines:good});
   if(review.length)sections.push({heading:"Source review — original extraction",kind:"text",lines:review});
   additions.push({title:`${socialTitle(chapter)} — teacher revision`,kind:"content",visual:"book",bullets:[],notes:[],key_terms:[],sections,grounding:parsed.text,caption:`Teacher revision · ${book.file_name} · ${label}`,teacher_revision:{book_id:book.id,file_name:book.file_name,page:page.page>0?page.page:undefined},reference_visuals:parsed.visuals.filter(v=>v.storage_path===`${book.storage_path}.page-${v.page}.jpg`).map(v=>({...v,book_id:book.id,book:book.file_name,chapter}))});
  }
 }
 const core=result.slides.filter(slide=>!slide.teacher_revision).map(slide=>socialNotesPresentationSlide(slide,subject));
 // The uploaded chapter notes and their unchanged diagrams lead the lesson.
 // NCERT explanations and questions remain available after the supplied material.
 return {...result,slides:[...additions,...core]};
}
