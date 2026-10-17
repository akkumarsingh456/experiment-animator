import type { Slide } from "@/lib/generate.functions";
import { mapOutsideMath } from "@/lib/latex-notation";

/** Remove identifiable PDF furniture, never dates, statistics, equations or source images. */
export function cleanSocialNoteText(line:string):string {
 return mapOutsideMath(line, text=>text.split(/("[^"\n]*"|“[^”\n]*”)/g).map((part,index)=>index%2?part:part
  .replace(/\b(?:\d{1,3}\s+)?D\s+EMOCRATIC\s+P\s+OLITICS\b/gi, " ")
  .replace(/\b(?:\d{1,3}\s+)?D\s+e\s+m\s+o\s+c\s+r\s+a\s+t\s+i\s+c\s+P\s+o\s+l\s+i\s+t\s+i\s+c\s+s\b/gi, " ")
  .replace(/\b(?:Reprint|Reprinted|Rationalised Edition)\s+20\d{2}(?:\s*[-–]\s*\d{2})?\b/gi, " ")
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
 return {...slide,bullets:slide.bullets.map(cleanSocialNoteText),notes:slide.notes.map(cleanSocialNoteText),sections:slide.sections?.map(section=>{
  if(/^Source (?:review|table)/i.test(section.heading)||section.kind==="diagram")return section;
  const rhetorical=section.lines.some(line=>/^\*\*Formula:\*\*\s*Sharing power\s*=/i.test(line));
  if(section.kind==="formula"&&!rhetorical)return section;
  return {...section,kind:rhetorical&&section.kind==="formula"?"bullets":section.kind,lines:section.lines.map(line=>cleanSocialNoteText(line).replace(/^\*\*Formula:\*\*(?=\s*Sharing power\s*=)/i,"**Discussion statement:**"))};
 })};
}
