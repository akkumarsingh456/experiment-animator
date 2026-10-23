/** A reversible view of the source transcription. Never replace stored source text. */
export function presentPyq(raw:string,subject=''){
 const code=/computer|informatics|programming/i.test(subject);
 const warnings:string[]=[],lines=raw.replace(/\r\n?/g,'\n').split('\n');
 let removed=false;
 // Paper identifiers are only furniture when accompanied by a page number or PTO.
 // Do not remove arbitrary numeric lines: they may be answers, matrices or code.
 const footer=/^\s*\d{1,3}(?:\s*\/\s*\d{1,3}){1,3}\s+.*(?:\bP\.?\s*T\.?\s*O\.?|\s\d{1,3})\s*$/i;
 const shortFooter=/^\s*\d{1,3}\s*\([A-Z]\)\s+\d{1,3}\s*$/i;
 const kept:string[]=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  if(footer.test(line)||shortFooter.test(line)||/^\s*P\.?\s*T\.?\s*O\.?\s*$/i.test(line)){
   removed=true;
   const tail=lines.slice(i+1).join('\n');
   // Bilingual font debris sometimes follows a footer. Hide only a terminal
   // fragment with explicit empty labels / broken brackets and no prose.
   // Keep code verbatim (ELSE, brackets and numbers can all be meaningful).
   const remainder=tail.replace(/\bELSE\b/g,'').replace(/\((?:[a-z]|[ivx]+)\)/gi,'');
   if(!code&&/(?:\[\s*\]|\[OL\s*;|\((?:i|ii|iii)\)\s*$)/im.test(tail)&&!/[\p{L}]{3}/u.test(remainder.replace(/\[OL\s*;/g,''))){
    warnings.push('A trailing alternative or subpart is unreadable. Open the original PDF for the missing text.');
    break;
   }
   // A standalone number immediately after a recognised footer is its page number.
   if(/^\s*\d{1,3}\s*$/.test(lines[i+1]||''))i++;
   continue;
  }
  kept.push(line.trimEnd());
 }
 // Empty subpart labels at the end are evidence of lost text, not questions.
 if(!code){
  while(kept.length&&(!kept.at(-1)!.trim()||/^\s*(?:\((?:[a-z]|[ivx]+)\)|\[\s*\])\s*$/i.test(kept.at(-1)!))){
   if(kept.pop()!.trim())warnings.push('Some subpart text is missing from the extraction. Check the original PDF before teaching.');
  }
 }
 let text=kept.join('\n').trim().replace(/\n{3,}/g,'\n\n');
 if(!code){
  // Keep recognised subparts on their own lines, without rewriting their wording.
  text=text.replace(/([^\n])\s+(\((?:[a-d]|[ivx]{1,4})\)\s+)/g,'$1\n$2');
  const alternatives=text.split(/(?:^|\n)\s*OR\s*(?:\n|$)/i);
  if(alternatives.length>1&&alternatives.slice(1).some(part=>!/[\p{L}]{2}/u.test(part)))warnings.push('The alternative after OR is incomplete. Open the original PDF for the missing question.');
  if(/(?:^|\n)\s*(?:\d+\s+\d+\s*=\s*\d+|\[[^\p{L}\p{N}]*\]|[^\p{L}\p{N}\s]{3,})\s*(?:\n|$)/u.test(text))warnings.push('Some marks or symbols could not be read reliably. Check their notation in the original PDF.');
 }
 if(text.includes('\uFFFD')||/[\uE000-\uF8FF]/u.test(text))warnings.push('Some PDF characters are unreadable. Use Read again or check the original PDF.');
 return {text,code,removed,warnings:[...new Set(warnings)]};
}

/** Trigger OCR for broken font encodings as well as image-only pages. */
export function needsPyqOcr(text:string){
 const visible=text.replace(/\s/g,'');
 const broken=(text.match(/[\uFFFD\uE000-\uF8FF]/gu)||[]).length;
 return visible.length<80||broken>Math.max(3,visible.length*.015);
}
