import registry from './attention-source-registry.json';
import {canonicalAttentionTopic,type AttentionScope} from './attention-topic-scope';

export type AttentionSource={url:string;title:string;sourceClass:string;provider:string};
export type ReadAttentionSource=AttentionSource&{text:string};
const pending=new Map<string,Promise<ReadAttentionSource|null>>();
const hosts=new Set(['ncert.nic.in','www.ncert.nic.in','ciet.ncert.gov.in','www.ciet.ncert.gov.in','cbseacademic.nic.in','www.cbseacademic.nic.in','sathee.iitk.ac.in','developer.mozilla.org']);
export function approvedAttentionUrl(value:string){
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&hosts.has(url.hostname);}catch{return false;}
}
const decode=(s:string)=>s.replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(Math.min(0x10ffff,n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n)))).replace(/&nbsp;/gi,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");
/** Read prose/code and keep table rows explicit. Never import logos or page images. */
export function attentionHtmlText(html:string){
 let body=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
 if(!body){const start=html.search(/<(?:div|article)\b[^>]*(?:class\s*=\s*(?:["'][^"']*\b(?:td-content|content-wrapper)\b|td-content\b)|id\s*=\s*(?:["']?(?:content-section|content|main-content)\b))/i);if(start<0)return '';body=html.slice(start).split(/<\/article>|<footer\b|<div\b[^>]*class=["'][^"']*\bfooterlink/i)[0];}
 return decode(body.replace(/<(?:script|style|nav|aside|footer|button|svg)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer|button|svg)>/gi,' ')
  .replace(/<annotation\b[^>]*encoding=["']application\/x-tex["'][^>]*>([\s\S]*?)<\/annotation>/gi,' $$$1$ ')
  .replace(/<\/?(?:td|th)\b[^>]*>/gi,' | ').replace(/<\/?(?:p|div|h[1-6]|li|br|section|article|tr|pre)\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,' '))
  .replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n\n').trim();
}
async function download(url:string){
 let target=url;
 for(let redirect=0;redirect<3;redirect++){
  if(!approvedAttentionUrl(target))return null;
  const response=await fetch(target,{signal:AbortSignal.timeout(20000),redirect:'manual'});
  if(response.status>=300&&response.status<400){const location=response.headers.get('location');if(!location)return null;target=new URL(location,target).href;continue;}
  if(!response.ok||!response.body)return null;
  const max=25_000_000;if(Number(response.headers.get('content-length'))>max)return null;
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let length=0;
  try{for(;;){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>max){await reader.cancel();return null;}chunks.push(part.value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return bytes;
 }
 return null;
}
export function attentionSourceBindings(input:AttentionScope):AttentionSource[]{
 const canonical=canonicalAttentionTopic(input);if(!canonical)return [];
 return registry.find(row=>row.klass===canonical.klass&&row.subject===canonical.subject&&row.chapter===canonical.chapter)?.sources.filter(source=>approvedAttentionUrl(source.url)&&(source.sourceClass==='general'||Number(source.sourceClass)<=Number(canonical.klass)))||[];
}
export function readAttentionSource(source:AttentionSource){
 if(!approvedAttentionUrl(source.url))return Promise.resolve(null);
 if(!pending.has(source.url))pending.set(source.url,(async()=>{
  try{
   const bytes=await download(source.url);if(!bytes)return null;let text='';
   if(new TextDecoder().decode(bytes.subarray(0,5))==='%PDF-'){
    const {getDocumentProxy,extractText}=await import('unpdf');
    const pdf=await getDocumentProxy(bytes,{maxImageSize:4_000_000});
    try{if(pdf.numPages>400)return null;const result=await extractText(pdf,{mergePages:false});text=(Array.isArray(result.text)?result.text:[result.text]).join('\n\n');}finally{await pdf.loadingTask.destroy();}
   }else text=attentionHtmlText(new TextDecoder().decode(bytes));
   return text.length>=200?{...source,text:text.slice(0,1_500_000)}:null;
  }catch{return null;}
 })().then(result=>{if(!result)pending.delete(source.url);return result;}));
 // Retain only a bounded number of source documents in a worker instance.
 while(pending.size>24)pending.delete(pending.keys().next().value!);
 return pending.get(source.url)!;
}
export async function readAttentionSources(input:AttentionScope){
 if(!canonicalAttentionTopic(input))return [];
 const results=await Promise.all(attentionSourceBindings(input).map(readAttentionSource));
 return results.filter((value):value is ReadAttentionSource=>!!value);
}
