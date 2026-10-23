import type {GuidedGroup} from './guided-notes';
import {splitMath} from './latex-notation';
import {sourceExtractionIssue} from './source-extraction-review';

/** Guide-only display checks. Never reconstruct damaged numerical calculations. */
export function guideExtractionIssue(text:string){
 const existing=sourceExtractionIssue(text);if(existing)return existing;
 const plain=text.replace(/\\(?:times|cdot)/g,'×').replace(/\$/g,' ').replace(/[{}]/g,'');
 if(/[=×]|\\frac|mass|average/i.test(text)&&/\d+\.\d{2,}\.\d{2,}/.test(plain))
  return 'PDF extraction joined several numerical values. The calculation needs its original fractions and operators; the missing arrangement cannot be inferred safely.';
 if(/(?:[×+−=\-]\s*){3,}/.test(plain)||/\b\d{2}\s+\d\.\d{4,}\s+\d\.\d{4,}\s+10\b/.test(plain))
  return 'The source equation has detached values, powers or operators. Compare the original textbook equation before using it.';
 return null;
}
export function guideNoteGroups(groups:GuidedGroup[]):GuidedGroup[]{
 const output:GuidedGroup[]=[],damaged:string[]=[];
 const add=(heading:string,kind:GuidedGroup['kind'],line:string)=>{
  const last=output.at(-1);if(last?.heading===heading&&last.kind===kind)last.lines.push(line);else output.push({heading,kind,lines:[line]});
 };
 for(const group of groups){
  if(/^Source (?:review|table)/i.test(group.heading)){output.push({...group,lines:[...group.lines]});continue;}
  for(const line of group.lines){
   if(!/code|program|syntax|quotation/i.test(group.heading)&&guideExtractionIssue(line)){damaged.push(line);continue;}
   if(group.kind!=='formula'){add(group.heading,group.kind,line);continue;}
   // A prose paragraph with an incidental A=173 is not a formula-table row.
   const cells=line.split(' | '),outside=splitMath(line).filter(part=>part.type==='text').map(part=>part.value).join(' ');
   const words=outside.match(/\b[A-Za-z]{2,}\b/g)||[];
   const tabular=cells.length===3&&cells.every(cell=>cell.trim().length>0);
   if(!tabular||words.length>24){add('Relations and source explanation','prose',line);continue;}
   add(group.heading,'formula',line);
  }
 }
 if(damaged.length)output.push({heading:'Source review — original extraction',kind:'list',lines:[...new Set(damaged)]});
 return output;
}
