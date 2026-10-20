import { mapOutsideMath, splitMath } from './latex-notation';

export function validStudyTerm(term:string,meaning:string):boolean {
  return term.trim().length>=3&&term.length<=48
    && !/\b[A-Z](?:\s+[A-Z]){3,}\b/.test(term)
    && !/^(?:For|From|With|Thus|Since|However)\b/i.test(term)&&meaning.trim().length>=18
    && !/^(?:and|or|but|s core|they|there|these|those|this|that|it|how|what|why|when|which|where|who|if|thus|hence|therefore|we|you|one of)\b/i.test(term.trim())
    && !/[?]|\b(?:intext question|example\s+\d|solution solution)\b/i.test(`${term} ${meaning}`);
}

export function isSourceTask(text:string):boolean {
  const body=text.replace(/^\*\*[^*]+:\*\*\s*/,'');
  return /\?\s*$|^(?:calculate|comment on|show that|how can|explain why|determine|find the|state whether)\b/i.test(body)
    || /^\s*\(?[a-d]\)\s+/i.test(body)
    || /\b(?:Calculate|Determine|Comment on)\s+(?:the|whether|how)\b/.test(body);
}

/** Lost row/column alignment cannot safely be turned into a scientific claim. */
export function collapsedSourceTable(text:string):boolean {
  const lattice=(text.match(/\b(?:hcp|bcc|ccp|fcc)\b/gi)||[]).length;
  const ions=(text.match(/\b(?:Sc|Ti|Cr|Mn|Fe|Co|Ni|Cu|Zn|Y|Zr|Nb|Mo|Ru|Rh|Pd|Ag|Cd|La|Hf|Ta|W|Re|Os|Ir|Pt|Au|Hg)\b/g)||[]).length;
  const states=(text.match(/[+-]\s*\d\b|\b\d\s*[+-]/g)||[]).length;
  const colours=(text.match(/\b(?:colourless|colorless|violet|purple|bluepink|pink|yellow|green|blue)\b/gi)||[]).length;
  return lattice>=6||(ions>=6&&(states>=6||colours>=5));
}

export function readableSourceRelation(text:string):boolean {
  if(hasBrokenSourceMath(text))return false;
  const expressions=splitMath(text).filter(part=>part.type!=='text').map(part=>part.value);
  return /[=∝≈<>→⇌]|\\(?:propto|approx|equiv|rightarrow|rightleftharpoons|leq|geq)\b/.test(expressions.length?expressions.join(' '):text);
}

/** A running page/section heading embedded in an equation is extraction damage. */
export function hasSourcePrintIntrusion(text: string): boolean {
  const plain = splitMath(text).filter(part => part.type === 'text').map(part => part.value).join(' ');
  return /\b\d{1,3}\s+\d{1,2}\.\d{1,2}\s+(?:[A-Z][A-Z -]{2,}){2}/.test(plain)
    || /\b\d{1,2}\.\d{1,2}\s+[A-Z](?:\s*[A-Z]){10,}/.test(plain);
}

/** Detect local extraction damage even when a long prose sentence hides it. */
export function hasBrokenSourceMath(raw:string):boolean {
  const text=String(raw||'');
  if (hasSourcePrintIntrusion(text)) return true;
  // Flattened textbook summary equations must not become one multiplied term,
  // and duplicated graph labels cannot stand in for a lost fraction.
  if (/\bat\s*2\s*2\s*a\s*s\s*=/i.test(text.replace(/[${}^\\]/g,''))
    || /\b(?:BDBD|ADOC)\b/.test(text) && /[=]|change in velocity/i.test(text)) return true;
  if (/[=∝]/.test(text) && /\b[abcxyz]{8,}\b/i.test(text.replace(/\$[^$]*\$/g," "))) return true;
  if (/[\uFFFD\u25A1\u25AF\u0000\uE000-\uF8FF]/u.test(text)) return true;
  const mathematical=/[=∝]|\*\*(?:formula|equation|relation)|\bEq\./i.test(text);
  // PDF equation layers can flatten fractions into duplicated operators and
  // differential symbols. Never "repair" these by merely removing repeats:
  // the missing numerator, denominator or sign cannot be inferred safely.
  const unquoted = (value: string) => value.replace(/"[^"\n]*"|“[^”\n]*”|`[^`\n]*`/g, "");
  const segments = splitMath(text);
  const prose = segments.filter(part => part.type === 'text').map(part => unquoted(part.value)).join(' ');
  const missingOperands = segments.some(part => /=\s*[+−-]\s*=|=\s*=\s*[+−-]/.test(unquoted(part.value)));
  const repeatedDifferentials = /([δ∂Δ∆])(?:\s+\1){2,}(?=\s|$)/u.test(prose);
  if (mathematical && (missingOperands || repeatedDifferentials)) return true;
  return mathematical && (
    /(?:\b\d{1,3}\s+){4,}\d{1,3}\b/.test(text) ||
    /\b([a-zA-Z]{1,3})\1{3,}\b/.test(text) ||
    /(?:\b[A-Za-z]\s+){6,}[A-Za-z]\b/.test(text) ||
    (/\b(?:sin|cos|tan)\s*\d+/i.test(text) && /(?:\b[A-Z]\s+){3,}[A-Z]\b/.test(text))
  );
}

/** Repeated section IDs are PDF running-header furniture, not numerical examples.
 * Restrict to repeated dotted IDs outside math and quotations; keep single references.
 */
export function stripRepeatedPrintHeaders(line: string): string {
  return mapOutsideMath(line, text => text.split(/("[^"\n]*"|“[^”\n]*”)/g).map((part, index) => index % 2 ? part : part.replace(
    /\b(\d{1,2}\.\d{1,2})(?:\s+\1){2,}\b(?:\s+(?:[A-Z][A-Za-z’'-]*\s+){1,5}(?:Chemistry|Physics|Biology|Mathematics|Science)\b)?\s*/g, " "
  )).join("")).replace(/ {2,}/g, " ").trim();
}

/** Never reconstruct an unreadable scientific equation from its page number. */
export function cleanSourceNoteLine(raw:string):string {
  let line=stripRepeatedPrintHeaders(String(raw||'').trim());
  if(!line||collapsedSourceTable(line)||hasSourcePrintIntrusion(line))return '';
  line=mapOutsideMath(line,text=>text.split(/("[^"\n]*"|“[^”\n]*”)/g).map((part,index)=>index%2?part:part
    .replace(/(?:\bIntext\s+Questions?\s*){2,}/gi,' ')
    .replace(/(?:\bExample\s+\d+(?:\.\d+)?\s*){2,}/gi,' ')
    .replace(/(?:\bSolution\s*){2,}/gi,' ')
    .replace(/\b([\p{L}]{3,})(?:\s+\1\b){2,}/giu,'$1')
    .replace(/\s{2,}/g,' ')).join('')).trim();
  if(collapsedSourceTable(line))return '';
  const body=line.replace(/^\*\*[^*]+:\*\*\s*/,'');
  if(/^(?:\d{1,2}\.\d{1,2}\s+)?(?:is|are|lists|shows|gives)\s+(?:the|that|a|an|how)\b/i.test(body)||/\bone of the no features\b/i.test(body))return '';
  const task=isSourceTask(body);
  if(task&&!hasBrokenSourceMath(line)&&/^\*\*(?:definition|formula|equation|relation|si unit|key point|important point|example):/i.test(line)){
    return `**Check your understanding:** ${body}`;
  }
  if(/^(?:Therefore|Thus|Hence),?\s+they\b/i.test(body)&&body.split(/[.!?]/).filter(Boolean).length===1)return '';
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
