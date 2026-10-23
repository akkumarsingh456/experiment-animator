import {cbsePapers} from './cbse-pyq';
type Entry={name:string;offset:number;compressed:number;size:number;central:Uint8Array};
const indexes=new Map<string,{expires:number;entries:Entry[]}>();
export function officialPaper(url:string){const paper=cbsePapers.find(p=>p.url===url);if(!paper)throw new Error('Choose an indexed official CBSE paper.');return paper;}
async function bounded(response:Response,max:number){
 if(!response.ok||!response.body)throw new Error('The official CBSE PDF connection failed. Retry later.');
 if(Number(response.headers.get('content-length'))>max){await response.body.cancel();throw new Error('CBSE did not return a bounded PDF range. Please retry later.');}
 const chunks:Uint8Array[]=[];let length=0;const reader=response.body.getReader();
 for(;;){const next=await reader.read();if(next.done)break;length+=next.value.length;if(length>max){await reader.cancel();throw new Error('The PDF response exceeded its safe size.');}chunks.push(next.value);}
 const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}return bytes;
}
async function range(url:string,value:string,max:number){
 const response=await fetch(url,{headers:{Range:value,'Accept-Encoding':'identity'},redirect:'error',signal:AbortSignal.timeout(30000)});
 if(response.status!==206){await response.body?.cancel();throw new Error('CBSE range access is temporarily unavailable. Retry this PDF later.');}
 return bounded(response,max);
}
async function archiveEntries(url:string){
 const cached=indexes.get(url);if(cached&&cached.expires>Date.now())return cached.entries;
 const tail=await range(url,'bytes=-65557',65557),view=new DataView(tail.buffer,tail.byteOffset,tail.byteLength);let end=-1;
 for(let i=tail.length-22;i>=0;i--)if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)===tail.length){end=i;break;}
 if(end<0)throw new Error('The official paper package index could not be read.');
 const length=view.getUint32(end+12,true),offset=view.getUint32(end+16,true);
 if(length>4_000_000||offset===0xffffffff)throw new Error('This CBSE package needs a newer PDF reader.');
 const central=await range(url,`bytes=${offset}-${offset+length-1}`,4_000_000),entries:Entry[]=[];
 for(let at=0;at+46<=central.length;){
   const row=new DataView(central.buffer,central.byteOffset+at,central.length-at);if(row.getUint32(0,true)!==0x02014b50)break;
   const nameLength=row.getUint16(28,true),extra=row.getUint16(30,true),comment=row.getUint16(32,true),recordLength=46+nameLength+extra+comment;
   if(at+recordLength>central.length)throw new Error('The CBSE PDF index is incomplete.');
   const name=new TextDecoder().decode(central.subarray(at+46,at+46+nameLength));
   if(/\.pdf$/i.test(name))entries.push({name,offset:row.getUint32(42,true),compressed:row.getUint32(20,true),size:row.getUint32(24,true),central:central.slice(at,at+recordLength)});
   at+=recordLength;
 }
 if(!entries.length)throw new Error('No individual PDFs were found in this official paper package.');
 indexes.set(url,{expires:Date.now()+900000,entries});if(indexes.size>24)indexes.delete(indexes.keys().next().value!);return entries;
}
export async function listOfficialPdfs(url:string){
 const paper=officialPaper(url);return paper.format==='PDF'?[{name:decodeURIComponent(new URL(url).pathname.split('/').at(-1)!),size:0}]:(await archiveEntries(url)).map(entry=>({name:entry.name,size:entry.size}));
}
export async function officialPdfBytes(url:string,name:string){
 const paper=officialPaper(url);let bytes:Uint8Array;
 if(paper.format==='PDF'){
   const expected=(await listOfficialPdfs(url))[0].name;if(name!==expected)throw new Error('Select an official PDF set.');
   bytes=await bounded(await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)}),30_000_000);
 }else{
   const entry=(await archiveEntries(url)).find(row=>row.name===name);if(!entry)throw new Error('This PDF set was not found in the official paper index.');
   if(entry.size>30_000_000||entry.compressed>30_000_000)throw new Error('This PDF exceeds the inline reader size limit.');
   const header=await range(url,`bytes=${entry.offset}-${entry.offset+29}`,30),view=new DataView(header.buffer,header.byteOffset,header.byteLength);
   if(view.getUint32(0,true)!==0x04034b50)throw new Error('The official PDF entry is not readable.');
   const size=30+view.getUint16(26,true)+view.getUint16(28,true)+entry.compressed;
   const local=await range(url,`bytes=${entry.offset}-${entry.offset+size-1}`,30_100_000);
   const central=entry.central.slice();new DataView(central.buffer).setUint32(42,0,true);
   const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,1,true);ev.setUint16(10,1,true);ev.setUint32(12,central.length,true);ev.setUint32(16,local.length,true);
   const single=new Uint8Array(local.length+central.length+22);single.set(local);single.set(central,local.length);single.set(end,local.length+central.length);
   const {default:JSZip}=await import('jszip'),zip=await JSZip.loadAsync(single,{checkCRC32:true});bytes=await zip.files[name].async('uint8array');
 }
 if(new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw new Error('The official file did not contain a valid PDF.');return bytes;
}
export async function serveOfficialPdf(request:Request){
 try{
   const params=new URL(request.url).searchParams,paper=officialPaper(params.get('paper')||''),file=params.get('file')||'';
   if(!file||file.length>500)return new Response('Invalid PDF selection',{status:400});
   if(paper.format==='PDF'){
     if(file!==(await listOfficialPdfs(paper.url))[0].name)return new Response('Invalid PDF set',{status:400});
     const range=request.headers.get('range');if(range&&!/^bytes=(?:\d+-\d*|-\d+)$/.test(range))return new Response('Invalid PDF range',{status:416});
     const response=await fetch(paper.url,{headers:range?{Range:range}:{},redirect:'error',signal:AbortSignal.timeout(30000)});
     if(!response.ok)return new Response('The official CBSE PDF is temporarily unavailable',{status:502});
     const headers=new Headers({'Content-Type':'application/pdf','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff','Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(file)}`});
     for(const name of ['content-length','content-range','accept-ranges']){const value=response.headers.get(name);if(value)headers.set(name,value);}return new Response(response.body,{status:response.status,headers});
   }
   const bytes=await officialPdfBytes(paper.url,file),headers=new Headers({'Content-Type':'application/pdf','Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(file.split('/').at(-1)!)}`,'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'});
   const value=request.headers.get('range');if(value){const match=/^bytes=(\d+)-(\d*)$/.exec(value);if(!match)return new Response(null,{status:416});const start=Number(match[1]),end=Math.min(match[2]?Number(match[2]):bytes.length-1,bytes.length-1);if(start>end)return new Response(null,{status:416});headers.set('Content-Range',`bytes ${start}-${end}/${bytes.length}`);return new Response(bytes.slice(start,end+1) as BodyInit,{status:206,headers});}
   return new Response(bytes as BodyInit,{headers});
 }catch(error){return new Response(error instanceof Error?error.message:'Official PDF unavailable',{status:502,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});}
}
