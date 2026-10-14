import type {PDFDocumentProxy,PDFDocumentLoadingTask} from 'pdfjs-dist';
import {loadPdfjs} from '@/lib/pdf-extract';
const documents=new Map<string,{promise:Promise<PDFDocumentProxy>;task?:PDFDocumentLoadingTask}>();
export function manualPdfUrl(id:string,klass:string,subject:string){return `/api/med-easy-pdf?${new URLSearchParams({id,klass,subject})}`;}
/** Keep at most two parsed books so closing the reader does not restart network reads. */
export function cachedManualPdf(id:string,klass:string,subject:string):Promise<PDFDocumentProxy>{
 const key=manualPdfUrl(id,klass,subject),existing=documents.get(key);
 if(existing){documents.delete(key);documents.set(key,existing);return existing.promise;}
 const entry:{promise:Promise<PDFDocumentProxy>;task?:PDFDocumentLoadingTask}={promise:Promise.resolve(null as unknown as PDFDocumentProxy)};
 entry.promise=loadPdfjs().then(library=>{entry.task=library.getDocument({url:key,rangeChunkSize:1048576,disableStream:true,disableAutoFetch:true});return entry.task.promise;}).catch(error=>{if(documents.get(key)===entry)documents.delete(key);throw error;});
 documents.set(key,entry);
 if(documents.size>2){const first=documents.keys().next().value!;const old=documents.get(first)!;documents.delete(first);void old.promise.then(pdf=>pdf.loadingTask.destroy()).catch(()=>{});}
 return entry.promise;
}
export function retryManualPdf(id:string,klass:string,subject:string){const key=manualPdfUrl(id,klass,subject);const old=documents.get(key);documents.delete(key);void old?.promise.then(pdf=>pdf.loadingTask.destroy()).catch(()=>{});}
