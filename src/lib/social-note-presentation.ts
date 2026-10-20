import type { Slide } from "@/lib/generate.functions";
import { mapOutsideMath } from "@/lib/latex-notation";

/** Keep detached map legends available for source review, outside explanatory prose. */
function organizedSocialLines(lines:string[]):{lines:string[];labels:string[]} {
 const result:string[]=[],labels:string[]=[];
 for(const raw of lines){
  let line=cleanSocialNoteText(raw);
  const legend=line.match(/^([A-Z][A-Z\s(),–-]{70,}?)(?:\s+20\d{2}[-–]\d{2,4})?\s+(?=\d{1,2}\.\d{1,2}\s+[A-Z][a-z])/);
  if(legend){labels.push(legend[0].trim());line=line.slice(legend[0].length).replace(/^\d{1,2}\.\d{1,2}\s+/, '');}
  if(/^[A-Z\s(),–-]{70,}$/.test(line)){labels.push(line);continue;}
  if(/^(?:and|or|but|which|that|because|with|of|to|in)\b/.test(line)&&result.length){result[result.length-1]=result[result.length-1].replace(/[.]$/,'')+' '+line;continue;}
  if(line)result.push(line.replace(/^\d{1,3}\s*[—–]\s*(?=Indian indentured labourers)/,'Figure caption: '));
 }
 return {lines:result,labels};
}

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
 const review:string[]=[];
 const sections=slide.sections?.map(section=>{
  if(/^Source (?:review|table)/i.test(section.heading)||section.kind==="diagram")return section;
  const rhetorical=section.lines.some(line=>/^\*\*Formula:\*\*\s*Sharing power\s*=/i.test(line));
  if(section.kind==="formula"&&!rhetorical)return section;
  const organized=organizedSocialLines(section.lines);review.push(...organized.labels);
  return {...section,kind:rhetorical&&section.kind==="formula"?"bullets" as const:section.kind,lines:organized.lines.map(line=>line.replace(/^\*\*Formula:\*\*(?=\s*Sharing power\s*=)/i,"**Discussion statement:**"))};
 });
 if(review.length&&sections)sections.push({heading:'Source review — map labels',kind:'text',lines:review});
 return {...slide,bullets:organizedSocialLines(slide.bullets).lines,notes:organizedSocialLines(slide.notes).lines,sections};
}
