import {z} from 'zod';
import {combinedReferenceSubject,screenshotBookMatches} from '@/lib/reference-books';
import {canImportMedEasy} from '@/lib/manual-image-import';
const links=new Map<string,{url:string;expires:number}>();
/** Forward byte ranges on the website origin; never buffer a whole book. */
export async function streamManualPdf(request:Request):Promise<Response>{
 const params=new URL(request.url).searchParams;
 const parsed=z.object({id:z.string().min(1).max(100),klass:z.string().max(30),subject:z.string().max(100)}).safeParse(Object.fromEntries(params));
 if(!parsed.success)return new Response('Invalid book request',{status:400});
 if(!canImportMedEasy(parsed.data.klass,parsed.data.subject))return new Response('Med Easy import is available only for Class 11–12 Physics and Chemistry.',{status:403});
 const range=request.headers.get('range');if(range&&!/^bytes=(?:\d+-\d*|-\d+)$/.test(range))return new Response('Invalid PDF byte range',{status:400});
 const data=parsed.data,key=JSON.stringify(data);
 try{
  let cached=links.get(key);
  if(!cached||cached.expires<Date.now()){
   const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
   const {data:book,error}=await db.from('ncert_books').select('id,class,subject,chapter,file_name,storage_path').eq('id',data.id).maybeSingle();
   if(error||!book||!combinedReferenceSubject(book)||!screenshotBookMatches(book,data.klass,data.subject))return new Response('Matching Med Easy book not found',{status:404});
   const signed=await db.storage.from('ncert-pdfs').createSignedUrl(book.storage_path,300);
   if(!signed.data?.signedUrl)return new Response('Book access is unavailable',{status:502});
   cached={url:signed.data.signedUrl,expires:Date.now()+120000};links.set(key,cached);if(links.size>24)links.delete(links.keys().next().value!);
  }
  const headers=new Headers({'Accept-Encoding':'identity'});if(range)headers.set('Range',range);
  const response=await fetch(cached.url,{method:request.method==='HEAD'?'HEAD':'GET',headers,signal:AbortSignal.any([request.signal,AbortSignal.timeout(30000)])});
  if(!response.ok&&response.status!==416){links.delete(key);return new Response('Stored PDF is unavailable. Retry the book reader.',{status:502});}
  const outgoing=new Headers({'Content-Type':'application/pdf','Cache-Control':'private, max-age=120'});
  for(const header of ['content-length','content-range','accept-ranges']){const value=response.headers.get(header);if(value)outgoing.set(header,value);}
  return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers:outgoing});
 }catch{return new Response('PDF connection failed. Please retry.',{status:502});}
}
