import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {combinedReferenceSubject,screenshotBookMatches} from '@/lib/reference-books';
import {splitReferenceContent} from '@/lib/reference-visuals';
import {indexLocalBookPage} from '@/lib/local-book-index';
import {parseBookContents,canonicalBookChapter} from '@/lib/book-chapter-priority';

/** Fetch the PDF on the server so the browser stays on the website's origin. */
export const openManualBookPdf=createServerFn({method:'POST'}).inputValidator((raw:unknown)=>z.object({id:z.string().max(100),klass:z.string().max(30),subject:z.string().max(100)}).parse(raw)).handler(async({data})=>{
 const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
 const {data:book,error}=await db.from('ncert_books').select('id,class,subject,chapter,file_name,storage_path').eq('id',data.id).maybeSingle();
 if(error||!book||!combinedReferenceSubject(book)||!screenshotBookMatches(book,data.klass,data.subject))throw new Error('A matching Med Easy book is not available.');
 const signed=await db.storage.from('ncert-pdfs').createSignedUrl(book.storage_path,300);
 if(!signed.data?.signedUrl)throw new Error('The book could not be opened.');
 const response=await fetch(signed.data.signedUrl,{signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw new Error('The stored PDF could not be loaded. Try opening a device copy.');
 return new Response(response.body,{headers:{'Content-Type':'application/pdf','Cache-Control':'private, no-store'}});
});

/** Reuse uploaded books and verified saved page indexes; do not trigger scanning. */
export const loadManualBookLinks=createServerFn({method:'POST'}).inputValidator((raw:unknown)=>z.object({klass:z.string().max(30),subject:z.string().max(100),chapter:z.string().max(300),topic:z.string().max(500)}).parse(raw)).handler(async({data})=>{
 const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
 const {data:books,error}=await db.from('ncert_books').select('id,class,subject,chapter,file_name,storage_path').limit(1000);
 if(error)throw new Error('The uploaded book library could not be opened.');
 const key=(value:string)=>(indexLocalBookPage(data.subject,value).chapter||value).toLowerCase().replace(/^chapter\s*\d+\s*[:.\-]?\s*/i,'').replace(/[^a-z0-9]/g,'');
 const terms=data.topic.toLowerCase().split(/\W+/).filter(term=>term.length>3&&!['chapter','points','notes','discussion'].includes(term));
 const selected=(books||[]).filter(book=>combinedReferenceSubject(book)&&screenshotBookMatches(book,data.klass,data.subject));
 const results=await Promise.all(selected.map(async book=>{
   const [{data:pages},{data:chunks}]=await Promise.all([
     db.from('ncert_pages').select('page_number,text').eq('book_id',book.id).limit(1000),
     db.from('ncert_chunks').select('content').eq('book_id',book.id).limit(1000),
   ]);
   const candidates:Array<{page:number;topic:boolean}>=[];
   const printedRanges:Array<{start:number;end:number}>=[];
   const inspect=(content:string,page?:number)=>{const source=splitReferenceContent(content);const matches=(chapter?:string)=>!!chapter&&key(chapter)===key(data.chapter);
     for(const range of parseBookContents(data.subject,source.context?.match_text||source.text))if(canonicalBookChapter(data.subject,range.chapter)===canonicalBookChapter(data.subject,data.chapter))printedRanges.push({start:range.start,end:range.end});
     if(page&&matches(source.context?.chapter))candidates.push({page,topic:terms.some(term=>(source.context?.match_text||source.text).toLowerCase().includes(term))});
     for(const visual of source.visuals)if(matches(visual.chapter||source.context?.chapter))candidates.push({page:visual.page,topic:terms.some(term=>`${visual.title} ${visual.description} ${visual.match_text||''}`.toLowerCase().includes(term))});
   };
   for(const page of pages||[])inspect(page.text,page.page_number);
   for(const chunk of chunks||[])inspect(chunk.content);
   const unique=new Map<number,boolean>();for(const candidate of candidates)if(candidate.page>0)unique.set(candidate.page,(unique.get(candidate.page)||false)||candidate.topic);
   return {id:book.id,name:book.file_name,url:`/api/med-easy-pdf?${new URLSearchParams({id:book.id,klass:data.klass,subject:data.subject})}`,printedRange:printedRanges[0],pages:[...unique].map(([page,topic])=>({page,topic})).sort((a,b)=>Number(b.topic)-Number(a.topic)||a.page-b.page).slice(0,12)};
 }));
 const uniqueBooks=new Map<string,typeof results[number]>();
 for(const book of results){const name=book.name.toLowerCase().replace(/\.pdf$/,'').replace(/\(\s*\d+\s*\)/g,'').replace(/[^\p{L}\p{N}]/gu,'');const current=uniqueBooks.get(name);if(!current){uniqueBooks.set(name,book);continue;}const preferred=book.pages.length>current.pages.length?book:current;uniqueBooks.set(name,{...preferred,printedRange:preferred.printedRange||current.printedRange||book.printedRange,pages:[...new Map([...current.pages,...book.pages].map(page=>[page.page,page])).values()].sort((a,b)=>Number(b.topic)-Number(a.topic)||a.page-b.page).slice(0,12)});}
 return [...uniqueBooks.values()];
});
