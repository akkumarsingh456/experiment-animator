/** Legacy full-volume PDFs can continue into chapters omitted from today's catalogue. */
export function boundSavedChapterPages(pages:string[]):string[]{
 const clean=pages.filter(text=>{
  const numbers=text.match(/\b\d{2,3}\b/g)||[];
  return !/^\s*(?:index|subject index|contents)\b/i.test(text)&&numbers.length<35;
 });
 const counts=new Map<string,number>();
 for(const text of clean.slice(0,4))for(const match of text.matchAll(/\b(\d{1,2})\.\d{1,2}(?:\.\d{1,2})?\s+[A-Z]/g))counts.set(match[1],(counts.get(match[1])||0)+1);
 const expected=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0];
 if(!expected)return clean;
 const result:string[]=[];
 for(const text of clean){
  const sections=[...text.matchAll(/\b(\d{1,2})\.\d{1,2}(?:\.\d{1,2})?\s+[A-Z]/g)];
  // Only chapter transitions in section labels count; decimal values do not.
  if(sections.length&&!sections.some(match=>match[1]===expected)&&sections.some(match=>Number(match[1])>Number(expected)))break;
  result.push(text);
 }
 return result;
}
