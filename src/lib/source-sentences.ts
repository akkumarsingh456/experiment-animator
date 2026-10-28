/** Split source prose without cutting scientific references or a person's
 * initials. Preserve source words; never fill a genuinely missing passage. */
export function splitSourceSentences(raw:string):string[]{
 const parts=String(raw||'').replace(/\s+/g,' ').trim().split(/(?<=[.!?।])\s+/u);
 const sentences:string[]=[];
 for(const part of parts){
  if(!part)continue;
  const previous=sentences.at(-1)||'';
  const reference=/\b(?:Eq|Eqs|Fig|Figs)\.$/i.test(previous)&&/^\(?\d/.test(part);
  const initials=/(?:^|\s)(?:[A-Z]\.\s*){2,}$/.test(previous)&&/^[A-Z][a-z]/.test(part);
  const initialPair=/(?:^|\s)[A-Z]\.$/.test(previous)&&/^[A-Z]\.(?:\s|$)/.test(part);
  const title=/\b(?:Dr|Mr|Mrs|Ms|Prof|St)\.$/.test(previous)&&/^[A-Z]/.test(part);
  const example=/\b(?:e\.g|i\.e)\.$/i.test(previous);
  if(previous&&(reference||initials||initialPair||title||example))sentences[sentences.length-1]=`${previous} ${part}`;
  else sentences.push(part);
 }
 return sentences;
}
