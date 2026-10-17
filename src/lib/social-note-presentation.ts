import type { Slide } from "@/lib/generate.functions";
import { mapOutsideMath } from "@/lib/latex-notation";

/** Remove identifiable PDF furniture, never dates, statistics, equations or source images. */
export function cleanSocialNoteText(line:string):string {
 return mapOutsideMath(line, text=>text.split(/("[^"\n]*"|“[^”\n]*”)/g).map((part,index)=>index%2?part:part
  .replace(/\bIndia and the Contemporary World(?:\s*[–—-]?\s*(?:I|II|1|2))?\s+\d{1,3}\b/gi, " ")
  .replace(/\b(?:Contemporary India|Democratic Politics)(?:\s*[–—-]?\s*(?:I|II|1|2))?\s+\d{1,3}\b/gi," ")
  .replace(/\b(?:Economics|Understanding Economic Development)\s+\d{1,3}(?=\s+[A-Z])/g," ")
  .replace(/(\s{2,})\d{1,2}\s+(?=(?:The First World War|Differing Strands within the Movement)\b)/g,"$1")
  // A numbered heading needs at least two title words; decimal measurements stay intact.
  .replace(/(^|[.!?]\s+|\s{2,}|:\*\*\s+)\d{1,2}\.\d{1,2}\s+(?!(?:Million|Billion|Thousand|Hundred|Kilometres|Kilometers|Square|Per|Percent)\b)(?=[A-Z][a-z]+(?:\s+(?:in|of|the|and|within|a|to|for)){0,4}\s+[A-Z][a-z]+)/g,"$1")
 ).join("")).replace(/ {2,}/g," ").trim();
}

/** Also applied when opening saved lessons. Original teacher pages remain unmodified. */
export function socialNotesPresentationSlide(slide:Slide,subject?:string):Slide {
 if(subject!=="Social Science"||slide.teacher_pdf||slide.kind==="mcq")return slide;
 return {...slide,bullets:slide.bullets.map(cleanSocialNoteText),notes:slide.notes.map(cleanSocialNoteText),sections:slide.sections?.map(section=>/^Source (?:review|table)/i.test(section.heading)||section.kind==="formula"||section.kind==="diagram"?section:{...section,lines:section.lines.map(cleanSocialNoteText)})};
}
