import { mapOutsideMath, splitMath } from './latex-notation';

export function readableSourceRelation(text:string):boolean {
  if(hasBrokenSourceMath(text))return false;
  const expressions=splitMath(text).filter(part=>part.type!=='text').map(part=>part.value);
  return /[=∝≈<>→⇌]|\\(?:propto|approx|equiv|rightarrow|rightleftharpoons|leq|geq)\b/.test(expressions.length?expressions.join(' '):text);
}

/** Detect local extraction damage even when a long prose sentence hides it. */
export function hasBrokenSourceMath(raw:string):boolean {
  const text=String(raw||'');
  if (/[\uFFFD\u25A1\u25AF\u0000\uE000-\uF8FF]/u.test(text)) return true;
  const mathematical=/[=∝]|\*\*(?:formula|equation|relation)|\bEq\./i.test(text);
  return mathematical && (
    /(?:\b\d{1,3}\s+){4,}\d{1,3}\b/.test(text) ||
    /\b([a-zA-Z]{1,3})\1{3,}\b/.test(text) ||
    /(?:\b[A-Za-z]\s+){6,}[A-Za-z]\b/.test(text)
  );
}

/** Never reconstruct an unreadable scientific equation from its page number. */
export function cleanSourceNoteLine(raw:string):string {
  let line=String(raw||'').trim();
  if(!line)return '';
  if(hasBrokenSourceMath(line)){
    // A complete prose sentence following the damaged equation can survive.
    // The original Formula label must not follow it into the rendered card.
    const tail=line.match(/\b(?:Since|Because|The|This)\s+[a-z][\s\S]*[.!?]\s*$/)?.[0];
    if(!tail||hasBrokenSourceMath(tail)||/\b(?:Eq|Fig)\.?\s*$/i.test(tail))return '';
    line=`**Explanation:** ${tail}`;
  }
  line=mapOutsideMath(line,text=>{
    const prefix=text.match(/^(\s*\*\*[^*]+:\*\*\s*)?\(\d{1,2}\.\d{1,3}\)\s*[,;:]?\s*/);
    if(prefix){
      const remainder=text.slice(prefix[0].length);
      if(/^(?:is|are|was|were|has|have|remains?|becomes?)\b/i.test(remainder))return '';
      text=(prefix[1]||'')+remainder;
    }
    return text.replace(/\bcharge conuration\b/gi,'charge configuration');
  }).trim();
  if(/^\*\*(?:formula|equation|relation):\*\*/i.test(line)&&!readableSourceRelation(line)){
    line=line.replace(/^\*\*[^*]+:\*\*/, '**Explanation:**');
  }
  return line;
}
