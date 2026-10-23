import {loadPdfjs} from './pdf-extract';
import {createLocalBookReader} from './local-book-reader';
import {questionBlocks,suggestQuestionTopics,pyqPdfHref,type PyqReading} from './cbse-pyq-questions';
import {cbseCheckedAt} from './cbse-pyq';
import {needsPyqOcr} from './pyq-presentation';
const key=(url:string,file:string)=>JSON.stringify(['pyq-pdf-v3',cbseCheckedAt,url,file]);
async function database(){return new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('eduplan-pyq-readings',1);request.onupgradeneeded=()=>request.result.createObjectStore('papers');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
export async function savedPyqReadings(){const db=await database();try{return await new Promise<PyqReading[]>((resolve,reject)=>{const request=db.transaction('papers').objectStore('papers').getAll();request.onsuccess=()=>resolve(request.result.filter((r:PyqReading)=>r.questions&&r.readAt&&r.sourceCheckedAt===cbseCheckedAt));request.onerror=()=>reject(request.error);});}finally{db.close();}}
export async function storePyqReading(reading:PyqReading){const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('papers','readwrite');tx.objectStore('papers').put(reading,key(reading.url,reading.file));tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
export async function readPyqPdf(paper:{url:string;klass:string;subject:string;year:number;exam:string},file:string,onProgress:(message:string)=>void,cancelled:()=>boolean,sharedReader?:ReturnType<typeof createLocalBookReader>):Promise<PyqReading>{
 const response=await fetch(pyqPdfHref(paper.url,file),{signal:AbortSignal.timeout(60000)});if(!response.ok)throw new Error(await response.text());
 const max=45_000_000;if(Number(response.headers.get('content-length'))>max){await response.body?.cancel();throw new Error('This PDF is too large for local text reading. Its PDF view remains available.');}
 const chunks:Uint8Array[]=[];let length=0;const stream=response.body?.getReader();if(!stream)throw new Error('No PDF data was received.');
 for(;;){if(cancelled()){await stream.cancel();throw new Error('Reading paused.');}const next=await stream.read();if(next.done)break;length+=next.value.length;if(length>max){await stream.cancel();throw new Error('This PDF exceeds the local text-reading size limit. View its original PDF instead.');}chunks.push(next.value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const library=await loadPdfjs(),task=library.getDocument({data:bytes});let pdf;try{pdf=await task.promise;}catch(error){await task.destroy();throw error;}const reader=sharedReader||createLocalBookReader(onProgress);
 const pages:Array<{page:number;text:string;ocr:boolean}>=[];
 try{
   for(let number=1;number<=pdf.numPages;number++){
     if(cancelled())throw new Error('Reading paused. Completed PDF sets remain saved.');onProgress(`${paper.year} · ${file} · page ${number}/${pdf.numPages}`);
     const page=await pdf.getPage(number),content=await page.getTextContent();
     let text=content.items.map(item=>'str'in item?item.str+(item.hasEOL?'\n':' '):'').join(''),ocr=false;
     if(needsPyqOcr(text)){ocr=true;const natural=page.getViewport({scale:1}),viewport=page.getViewport({scale:1800/natural.width}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
       try{await page.render({canvas,viewport}).promise;text=await reader.recognize(canvas.toDataURL('image/jpeg',.9));}catch(error){if(sharedReader)await reader.close();throw error;}finally{canvas.width=canvas.height=0;}
     }
     pages.push({page:number,text,ocr});page.cleanup();
   }
   const questions=[],occurrences=new Map<string,number>();for(const block of questionBlocks(pages)){
     const occurrenceKey=JSON.stringify([block.page,block.number]),occurrence=occurrences.get(occurrenceKey)||0;occurrences.set(occurrenceKey,occurrence+1);
     const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([paper.url,file,block.page,block.number,occurrence])));
     questions.push({...block,id:Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('').slice(0,24),...suggestQuestionTopics(block.text,paper.klass,paper.subject)});
   }
   return {...paper,file,pages:pdf.numPages,ocrPages:pages.filter(page=>page.ocr).length,questions,readAt:new Date().toISOString(),sourceCheckedAt:cbseCheckedAt,warnings:[...(pages.some(page=>page.ocr)?['OCR transcription: check wording, equations, options and question boundaries against the PDF.']:[]),...(!questions.length?['No reliably numbered question blocks could be separated. Review the original PDF; this is not a claim that the paper has no questions.']:[])]};
 }finally{if(!sharedReader)await reader.close();await task.destroy();}
}
