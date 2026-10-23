import {cbsePapers,pyqSubjectMatches,pyqYears} from './cbse-pyq';
const recentSearches=new Map<string,number[]>();
/** Only catalogue URLs are fetched. A request never accepts an arbitrary PDF host. */
export async function searchOfficialPyq(input:{url:string;topic:string;klass:'10'|'12';year:number;subject:string;file?:string}){
 const {readLibraryIdentity}=await import('./library-access.server');
 const user=await readLibraryIdentity();if(!user)throw new Error('Sign in to search paper text. Official paper links remain public.');
 const paper=cbsePapers.find(p=>p.url===input.url&&p.klass===input.klass&&p.year===input.year&&pyqSubjectMatches(p.subject,input.subject));
 if(!paper||!pyqYears().includes(paper.year))throw new Error('Choose an official paper within the last five years.');
 const now=Date.now();for(const [id,times] of recentSearches)if(!times.some(time=>now-time<60000))recentSearches.delete(id);
 const times=(recentSearches.get(user.id)||[]).filter(time=>now-time<60000);if(times.length>=8)throw new Error('Please wait a minute before searching more paper sets. Downloads remain available.');recentSearches.set(user.id,[...times,now]);
 const response=await fetch(paper.url,{redirect:'error',signal:AbortSignal.timeout(25000)});
 if(!response.ok||!response.body)throw new Error('CBSE could not provide this paper. Use its official download link and retry later.');
 const max=35_000_000;if(Number(response.headers.get('content-length'))>max){await response.body.cancel();throw new Error('This archive is too large for inline search. Download it from CBSE to review every set.');}
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 for(;;){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>max){await reader.cancel();throw new Error('This archive is too large for inline search. Use the official download.');}chunks.push(next.value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 let pdfBytes:Uint8Array=bytes,fileName='Official paper.pdf',files:string[]=[];
 if(paper.format==='ZIP'){
   const {default:JSZip}=await import('jszip'),zip=await JSZip.loadAsync(bytes);
   files=Object.values(zip.files).filter(file=>!file.dir&&/\.pdf$/i.test(file.name)).map(file=>file.name).sort();
   if(!files.length)throw new Error('No PDF text was found in this archive. Review the original CBSE download.');
   fileName=input.file||files[0];if(!files.includes(fileName))throw new Error('Select a PDF from this paper archive.');
   const file=zip.files[fileName],declared=(file as unknown as {_data?:{uncompressedSize?:number}})._data?.uncompressedSize;
   if(!declared||declared>18_000_000)throw new Error('This PDF is too large for inline text search. Review the official download.');
   pdfBytes=await file.async('uint8array');
 }
 const {getDocumentProxy}=await import('unpdf'),pdf=await getDocumentProxy(pdfBytes);
 try{
   const words=[...new Set(input.topic.toLowerCase().match(/[a-z]{3,}/g)||[])].filter(word=>!['the','and','for','with','from','chapter','topic','class','introduction','properties'].includes(word));
   if(!words.length)throw new Error('Enter a specific topic or keyword from the lecture.');
   const hits:Array<{page:number;text:string;score:number}>=[],pages=Math.min(pdf.numPages,80);
   for(let pageNumber=1;pageNumber<=pages;pageNumber++){
     const page=await pdf.getPage(pageNumber),content=await page.getTextContent();
     const text=content.items.map(item=>'str'in item?item.str:'').join(' ').replace(/\s+/g,' ').trim(),lower=text.toLowerCase();
     const found=words.filter(word=>new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`,'i').test(lower));
     if(found.length>=Math.min(2,words.length)){
       const start=Math.max(0,lower.indexOf(found[0])-200);
       hits.push({page:pageNumber,text:text.slice(start,start+1600),score:found.length});
     }
     page.cleanup();
   }
   return {fileName,files,pagesScanned:pages,totalPages:pdf.numPages,hits:hits.sort((a,b)=>b.score-a.score||a.page-b.page).slice(0,12)};
 }finally{await pdf.loadingTask.destroy();}
}
