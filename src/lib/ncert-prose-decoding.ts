const headingKey=(s:string)=>s.toLowerCase().replace(/^chapter\s*\d+\s*[:.\-]?\s*/i,'').replace(/\s*\([^)]*\)\s*$/,'').replace(/[^a-z0-9]/g,'');
/** Recover the known ASCII-offset prose font only. Isolated mathematical glyphs
 * and mixed-font equations remain untouched for the existing notation guards. */
export function decodeNcertProse(text:string,knownHeadings:string[]=[]):string{
 const headings=new Set(knownHeadings.map(headingKey));
 return text.split('\n').map(line=>{
  const encoded=(line.match(/[\uF020-\uF07E]/g)||[]).length;
  if(encoded<5||encoded/Math.max(1,line.replace(/\s/g,'').length)<.7)return line;
  const decoded=line.replace(/[\uF020-\uF07E]/g,char=>String.fromCharCode(char.charCodeAt(0)-0xF000));
  const words=decoded.toLowerCase().match(/[a-z]+/g)||[];
  const natural=words.filter(word=>['the','and','of','to','in','is','are','that','with','for','from','this','we','our','their','has','have'].includes(word)).length>=2;
  const numbered=/^\s*\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\s+[A-Za-z][A-Za-z ’'\-]+$/.test(decoded)&&words.length>=2;
  const named=headings.has(headingKey(decoded))||headings.has(headingKey(decoded.replace(/^\s*\d+(?:\.\d+)*\s*/,'')));
  return natural||numbered||named?decoded:line;
 }).join('\n');
}
