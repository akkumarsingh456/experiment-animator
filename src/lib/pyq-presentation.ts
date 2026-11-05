/** A reversible view of the source transcription. Never replace stored source text. */

// Unreadable extraction debris: replacement characters, private-use glyphs
// (rendered as empty boxes) and white squares.
const unreadable=/[\uFFFD\u25A1\u25AF\u25A0\uE000-\uF8FF]/gu;
/** A line that is mostly unreadable box glyphs is extraction loss, not prose. */
function garbledLine(line:string){
 const broken=(line.match(unreadable)||[]).length;
 if(!broken)return false;
 const letters=(line.match(/[\p{L}\p{N}]/gu)||[]).length;
 return broken*2>letters;
}
/** Detect OCR that turned page furniture into a long string of shouty fragments.
 * Keep short acronyms and ordinary English sentences; this only targets lines
 * with several unrelated all-caps tokens and enough text to be noise. */
function scrambledOcrLine(line:string){
 const words=line.match(/[A-Za-z]+/g)||[];
 const uppercase=words.filter(word=>word.length>=2&&word===word.toUpperCase()).length;
 return words.length>=5&&line.replace(/[^A-Za-z]/g,'').length>=18&&uppercase>=3&&uppercase/words.length>=0.55;
}
/** Short all-caps scraps (e.g. HAYA) are hidden only beside a confirmed OCR line. */
function attachedOcrScrap(lines:string[],index:number){
 const line=lines[index]?.trim()||'';
 if(!/^[A-Z]{4,6}$/.test(line))return false;
 return [index-1,index+1].some(neighbor=>neighbor>=0&&neighbor<lines.length&&scrambledOcrLine(lines[neighbor]||''));
}
export function presentPyq(raw:string,subject='',layoutText?:string){
 const code=/computer|informatics|programming/i.test(subject);
 const warnings:string[]=[],sourceLines=raw.replace(/\r\n?/g,'\n').split('\n');
 // English-only presentation applies to historical saved readings as well.
 // Omit whole Hindi-bearing lines rather than turn their leftover symbols into
 // an invented English question. Stored source transcriptions remain intact.
 const hiddenHindi=sourceLines.some(line=>/\p{Script=Devanagari}/u.test(line));
 const lines=sourceLines.filter(line=>!/\p{Script=Devanagari}/u.test(line));
 if(hiddenHindi)warnings.push('English-only view: Hindi lines are omitted. The remaining English question may be incomplete; check the English version in the original CBSE paper.');
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
  if(!code&&garbledLine(line)){
   removed=true;
   warnings.push('Some unreadable characters were hidden. Check that part in the original CBSE PDF.');
   continue;
  }
  if(!code&&(scrambledOcrLine(line)||attachedOcrScrap(lines,i))){
   removed=true;
   warnings.push('Scrambled OCR fragments were hidden. Check that part in the original CBSE PDF.');
   continue;
  }
  // A line made only of braces/brackets is font debris, never a question
  // (code is excluded above, where brackets can be meaningful).
  if(!code&&/[{[]/.test(line)&&/^\s*[{[()\]}\s]*$/.test(line)){
   removed=true;
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
 if(!/[A-Za-z]{3}/.test(text))text='';
 const layoutApplied=!code&&validPyqLayout(text,layoutText);
 if(layoutApplied)text=layoutText!;
 return {text,code,removed,hiddenHindi,layoutApplied,warnings:[...new Set(warnings)]};
}

/** Layout changes may only replace existing whitespace, never question tokens. */
export function validPyqLayout(source:string,candidate?:string):boolean{
 return !!source.trim()&&typeof candidate==='string'&&candidate.length<=20000&&
  source.trim().split(/\s+/).join(' ')===candidate.trim().split(/\s+/).join(' ');
}

/** Trigger OCR for broken font encodings as well as image-only pages. */
export function needsPyqOcr(text:string){
 const visible=text.replace(/\s/g,'');
 const broken=(text.match(/[\uFFFD\uE000-\uF8FF]/gu)||[]).length;
 return visible.length<80||broken>Math.max(3,visible.length*.015);
}
