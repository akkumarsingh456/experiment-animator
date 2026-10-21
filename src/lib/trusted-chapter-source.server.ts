/** Narrow, public educational-source fallback. No arbitrary URLs or search
 * snippets: only an exact chapter in the requested grade's NCERT mirror. */
const ORIGIN='https://sathee.iitk.ac.in';
const cache=new Map<string,Promise<{url:string;text:string}|null>>();
const indexes=new Map<string,Promise<string>>();
const identity=(text:string)=>text.replace(/^\s*(?:chapter|unit)\s*[-:]?\s*\d+\s*[-:]?\s*/i,'').replace(/\s*\((Physics|Chemistry|Biology)\)\s*$/i,'').toLowerCase().replace(/^the\s+/,'').replace(/[^a-z0-9]/g,'');
const decode=(text:string)=>text.replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(Math.min(0x10ffff,n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n)))).replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");
export function trustedChapterHtmlText(html:string){
 const start=html.search(/<(?:div|article)\b[^>]*(?:class\s*=\s*(?:["'][^"']*\b(?:td-content|content-wrapper)\b|(?:td-content|content-wrapper)\b)|id\s*=\s*["']?content-section\b)/i);
 if(start<0)return '';
 return decode(html.slice(start).split(/<\/article>/i)[0].replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<annotation\b[^>]*encoding=["']application\/x-tex["'][^>]*>([\s\S]*?)<\/annotation>/gi,' $$$1$ ').replace(/<\/?(?:p|div|h[1-6]|li|br|section|article|tr)\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n').trim();
}
async function read(url:string){
 const target=new URL(url);if(target.origin!==ORIGIN||!target.pathname.includes('/ncert-books/'))return '';
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(7000),redirect:'error'});
   if(!response.ok){if(response.status===429||response.status>=500)continue;return '';}
   if(Number(response.headers.get('content-length'))>2_000_000)return '';
   const text=await response.text();return text.length<=2_000_000?text:'';
  }catch{if(attempt===1)return '';}
 }
 return '';
}
export function trustedChapterSource(klass:string,subject:string,chapter:string){
 const grade=klass.replace(/^Class\s*/i,'');
 const book=subject==='Science'&&/^(9|10)$/.test(grade)?'science':subject==='Physics'?'phy':subject==='Chemistry'?'che':subject==='Mathematics'?'math':'';
 if(!book||!/^(9|10|11|12)$/.test(grade))return Promise.resolve(null);
 const key=JSON.stringify([grade,subject,chapter]);
 if(!cache.has(key))cache.set(key,(async()=>{
  try{
   const g=grade.padStart(2,'0'),base=book==='science'?`${ORIGIN}/sathee-railway-exams/student-corner/ncert-books/class-${g}/nb-${book}-${g}/`:`${ORIGIN}/sathee-${book==='math'?'jee':'neet'}/ncert-books/${book==='math'?'jee':'neet'}-ncert-books/${book==='math'?'jee':'neet'}-nb-${book}-${g}/`;
   if(!indexes.has(base))indexes.set(base,read(base).then(value=>{if(!value)indexes.delete(base);return value;}));
   const index=await indexes.get(base)!;let url='';
   for(const link of index.matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi)){
    const target=new URL(decode(link[1]||link[2]||link[3]),base),label=decode(link[4].replace(/<[^>]*>/g,' ')).trim();
    if(target.origin===ORIGIN&&target.pathname.startsWith(new URL(base).pathname)&&target.href!==base&&identity(label)===identity(chapter)){url=target.href;break;}
   }
   if(!url)return null;
   const text=trustedChapterHtmlText(await read(url));
   return text.length>500?{url,text}:null;
  }catch{return null;}
 })().then(result=>{if(!result)cache.delete(key);return result;}));
 return cache.get(key)!;
}
