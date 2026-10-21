import scope from './attention-topic-scope.json';

export type AttentionScope={klass:string;subject:string;chapter:string;topic:string};
// This fixed allowlist is the user's filtered “Still needs attention” report.
// Updating a report later must not silently expand the online-note permission.
const key=(value:string)=>{
 const mathematical=/[=+*/^<>−]|[²³]/.test(value);
 const normalized=value.normalize('NFKC').toLowerCase().replace(/[‐‑‒–—−]/g,'-').replace(/^class\s*/,'').replace(/^(?:ch\.?\s*)?(?:chapter|unit)\s*\d+\s*[:.\-]?\s*/,'');
 // Do not authorise a different equation just because its letters match.
 return mathematical?normalized.replace(/[^\p{L}\p{N}=+*/^<>-]/gu,''):normalized.replace(/[^\p{L}\p{N}]/gu,'');
};
export const attentionTopics=scope.topics;
export function canonicalAttentionTopic(input:AttentionScope){
 return attentionTopics.find(row=>key(row.klass)===key(input.klass)&&key(row.subject)===key(input.subject)&&key(row.chapter)===key(input.chapter)&&key(row.topic)===key(input.topic));
}
export function attentionChapterTopics(input:Omit<AttentionScope,'topic'>){
 return attentionTopics.filter(row=>key(row.klass)===key(input.klass)&&key(row.subject)===key(input.subject)&&key(row.chapter)===key(input.chapter));
}
export function isAttentionTopic(input:AttentionScope){return !!canonicalAttentionTopic(input);}
