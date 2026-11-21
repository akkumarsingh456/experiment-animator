import { sourceExtractionIssue } from "./source-extraction-review";
import { hasBrokenSourceMath } from "./source-note-quality";
import { latexLineValid } from "./notes-verification";

export type CrossCheckResult = { slides: any[]; checked: number; removed: number; issues: string[] };

function readableGeneratedLine(raw: string): boolean {
  const line=String(raw||"").trim();
  if(!line)return false;
  if(sourceExtractionIssue(line)||hasBrokenSourceMath(line))return false;
  const math=latexLineValid(line);
  if(math.invalid>0)return false;
  // PDF/OCR often flattens a displayed equation into isolated symbols and
  // operators. A high density of one-character tokens in an equation-like
  // sentence is a strong extraction-damage signal, not a safe formula.
  const plain=line.replace(/\$\$?[\s\S]*?\$\$?/g," ");
  const isolated=(plain.match(/\b[A-Za-z]\b/g)||[]).length;
  if(/[=→Δδ∂]|\blim\b|\bdt\b|\bdx\b/i.test(plain)&&isolated>=7)return false;
  return true;
}


export function crossCheckGeneratedLines(lines: string[]) {
  let removed=0;
  const issues:string[]=[];
  const clean=lines.filter(line=>{
    const valid=readableGeneratedLine(line);
    if(!valid){removed++;issues.push("Malformed OCR or mathematical notation was excluded before display.");}
    return valid;
  });
  return {lines:clean,checked:lines.length,removed,pass:removed===0,issues:[...new Set(issues)]};
}
\n/** Final display-boundary check: run after every AI/additive generation stage. */
export function crossCheckGeneratedSlides(slides: any[]): CrossCheckResult {
  let checked=0,removed=0;
  const issues:string[]=[];
  const filterLines=(lines:unknown):string[]=>{
    if(!Array.isArray(lines))return [];
    return lines.filter((value):value is string=>{
      if(typeof value!=="string")return false;
      checked++;
      const valid=readableGeneratedLine(value);
      if(!valid){removed++;if(issues.length<12)issues.push("Unclear OCR, malformed equation, or invalid mathematical notation was excluded from learner-facing content.");}
      return valid;
    });
  };
  const output=slides.map(slide=>{
    const beforeSlideRemoved=removed;
    const next={...slide};
    if(Array.isArray(slide.bullets))next.bullets=filterLines(slide.bullets);
    if(Array.isArray(slide.notes))next.notes=filterLines(slide.notes);
    if(Array.isArray(slide.sections))next.sections=slide.sections.map((section:any)=>/^Source (?:review|table)/i.test(section.heading)?section:{...section,lines:filterLines(section.lines)}).filter((section:any)=>section.lines.length>0);
    if(Array.isArray(slide.teaching_support))next.teaching_support=slide.teaching_support.map((section:any)=>({...section,lines:filterLines(section.lines)})).filter((section:any)=>section.lines.length>0);
    if(Array.isArray(slide.key_terms))next.key_terms=slide.key_terms.filter((term:any)=>{
      checked++;
      const valid=readableGeneratedLine(String(term.term||""))&&readableGeneratedLine(String(term.meaning||""));
      if(!valid){removed++;if(issues.length<12)issues.push("An unclear generated key term or definition was excluded.");}
      return valid;
    });
    if(removed>beforeSlideRemoved&&slide.verification){
      next.verification={...slide.verification,overall_pass:false};
    }
    return next;
  });
  return {slides:output,checked,removed,issues:[...new Set(issues)]};
}
