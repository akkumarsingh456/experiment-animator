import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {PDFDocumentProxy} from 'pdfjs-dist';
import {loadPdfjs} from '@/lib/pdf-extract';
import {cachedManualPdf,retryManualPdf,manualPdfUrl} from '@/lib/manual-pdf-cache';
import {ChevronsLeft,ChevronsRight,ChevronLeft,ChevronRight,RotateCw,Download,Maximize,ImagePlus,X} from 'lucide-react';
const files=new Map<string,Promise<Blob>>();
export function ManualBookPdfViewer({id,name,klass,subject,initialPage,chapter='',suggestedPages=[],printedRange,onClose,onImport}:{id:string;name:string;klass:string;subject:string;initialPage:number;chapter?:string;suggestedPages?:number[];printedRange?:{start:number;end:number};onClose:()=>void;onImport:(file:File)=>void}){
 const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null),[page,setPage]=useState(initialPage),[zoom,setZoom]=useState(1),[error,setError]=useState(''),[loading,setLoading]=useState(true),[rendering,setRendering]=useState(false);
 const [pageInput,setPageInput]=useState(String(initialPage)),[rotation,setRotation]=useState(0),[sourceFile,setSourceFile]=useState<Blob|null>(null);
 const [renderedVersion,setRenderedVersion]=useState('');
 const [attempt,setAttempt]=useState(0),[downloading,setDownloading]=useState(false);
 const pdfUrl=manualPdfUrl(id,klass,subject);
 const ready=!!pdf&&!rendering&&renderedVersion===`${page}:${zoom}:${rotation}`;
 const canvas=useRef<HTMLCanvasElement>(null);
 const devicePdf=useRef<PDFDocumentProxy|null>(null);
 useEffect(()=>setPageInput(String(page)),[page]);
 function go(){const number=Number(pageInput);if(!pdf||!Number.isInteger(number)||number<1||number>pdf.numPages){setError(`Enter a whole page number from 1 to ${pdf?.numPages||1}.`);return;}setError('');setPage(number);}
 function download(blob:Blob,filename:string){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 async function read(blob:Blob){const library=await loadPdfjs();return library.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise;}
 async function downloadPdf(){setDownloading(true);try{let blob=sourceFile;if(!blob){const response=await fetch(pdfUrl);if(!response.ok)throw new Error();blob=await response.blob();setSourceFile(blob);files.set(`${klass}:${subject}:${id}`,Promise.resolve(blob));}download(blob,name);}catch{setError('The PDF download failed. Retry or open a device PDF.');}finally{setDownloading(false);}}
 useEffect(()=>{let cancelled=false;
  setLoading(true);setError('');setRenderedVersion('');
  const key=`${klass}:${subject}:${id}`;
  void cachedManualPdf(id,klass,subject).then(value=>{if(cancelled)return;setPdf(value);setPage(Math.max(1,Math.min(initialPage,value.numPages)));}).catch(()=>{if(!cancelled){files.delete(key);setError('The online PDF could not be opened. Select Retry or Open device PDF.');}}).finally(()=>{if(!cancelled)setLoading(false);});
  return()=>{cancelled=true;};
 },[id,klass,subject,initialPage,attempt]);
 useEffect(()=>()=>{void devicePdf.current?.loadingTask.destroy();},[]);
 useEffect(()=>{if(!pdf||!canvas.current)return;let cancelled=false;let task:ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']>|undefined;setRendering(true);
  void pdf.getPage(page).then(value=>{if(cancelled||!canvas.current)return;const viewport=value.getViewport({scale:1.5*zoom,rotation:(value.rotate+rotation)%360});const target=canvas.current;target.width=Math.ceil(viewport.width);target.height=Math.ceil(viewport.height);task=value.render({canvas:target,canvasContext:target.getContext('2d')!,viewport});return task.promise;}).then(()=>{if(!cancelled){setRenderedVersion(`${page}:${zoom}:${rotation}`);setError('');}}).catch(reason=>{if(!cancelled&&reason?.name!=='RenderingCancelledException')setError('This page could not be rendered. Try another page.');}).finally(()=>{if(!cancelled)setRendering(false);});return()=>{cancelled=true;task?.cancel();};
 },[pdf,page,zoom,rotation]);
 return createPortal(<div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="View Med Easy PDF" onKeyDown={event=>{if(event.key==='Escape')onClose();if((event.target as HTMLElement).matches('input,select,textarea'))return;if(event.key==='ArrowLeft'&&pdf){event.preventDefault();setPage(value=>Math.max(1,value-1));}if(event.key==='ArrowRight'&&pdf){event.preventDefault();setPage(value=>Math.min(pdf.numPages,value+1));}}}>
  <div className="bg-white rounded-xl w-full max-w-5xl h-[92vh] flex flex-col text-sm shadow-xl">
   <div className="p-3 border-b flex flex-wrap items-center gap-3"><strong className="flex-1">View PDF · {name}</strong><button onClick={onClose} aria-label="Close PDF reader"><X size={18}/></button></div>
   {chapter&&<div className="px-3 py-2 border-b bg-blue-50"><strong>{chapter}: {suggestedPages.length?`Go to PDF page ${suggestedPages[0]}.` : printedRange?`Book contents lists printed pages ${printedRange.start}–${printedRange.end}. PDF numbering may differ.`:'The chapter page has not been verified yet. Check the book contents.'}</strong>{!!suggestedPages.length&&<div className="flex flex-wrap gap-3 mt-1">{suggestedPages.slice(0,6).map(number=><button key={number} disabled={!pdf} className="underline text-blue-700" onClick={()=>{setError('');setPage(Math.max(1,Math.min(pdf?.numPages||1,number)));}}>Go to PDF page {number}</button>)}</div>}</div>}
   <div className="p-3 border-b flex flex-wrap items-center gap-3">
    <button title="First page" aria-label="First page" disabled={!pdf||page<=1} onClick={()=>setPage(1)}><ChevronsLeft size={18}/></button>
    <button title="Previous page" aria-label="Previous page" disabled={!pdf||page<=1} onClick={()=>setPage(value=>value-1)}><ChevronLeft size={18}/></button>
    <label>PDF page <input aria-label="Go to PDF page" className="w-20 border rounded px-2" type="text" inputMode="numeric" value={pageInput} disabled={!pdf} onInput={event=>setPageInput(event.currentTarget.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();go();}}}/> / {pdf?.numPages||'…'}</label>
    <button disabled={!pdf} onClick={go}>Go</button>
    <button title="Next page" aria-label="Next page" disabled={!pdf||page>=pdf.numPages} onClick={()=>setPage(value=>value+1)}><ChevronRight size={18}/></button>
    <button title="Last page" aria-label="Last page" disabled={!pdf||page>=pdf.numPages} onClick={()=>setPage(pdf!.numPages)}><ChevronsRight size={18}/></button>
    <label>Zoom <select aria-label="PDF zoom" value={zoom} onChange={event=>setZoom(Number(event.target.value))}><option value="0.5">50%</option><option value="0.75">75%</option><option value="1">100%</option><option value="1.5">150%</option><option value="2">200%</option></select></label>
    <button title="Fit page width" aria-label="Fit page width" disabled={!pdf} onClick={()=>setZoom(1)}><Maximize size={18}/></button>
    <button title="Rotate page clockwise" aria-label="Rotate page clockwise" disabled={!pdf} onClick={()=>setRotation(value=>(value+90)%360)}><RotateCw size={18}/></button>
    <button disabled={!pdf||downloading} onClick={()=>void downloadPdf()} className="flex gap-1 items-center"><Download size={16}/>{downloading?'Downloading…':'PDF'}</button>
    <button disabled={!ready} onClick={()=>canvas.current?.toBlob(blob=>{if(blob)download(blob,`book-page-${page}.png`);},'image/png')} className="flex gap-1 items-center"><Download size={16}/> Page PNG</button>
    <button disabled={!ready} className="text-blue-700 font-medium flex gap-1 items-center" onClick={()=>canvas.current?.toBlob(blob=>{if(blob){onImport(new File([blob],`book-page-${page}.png`,{type:'image/png'}));onClose();}},'image/png')}><ImagePlus size={16}/> Use this page image</button>
    <label className="cursor-pointer underline">Open device PDF<input type="file" accept="application/pdf" className="hidden" onChange={async event=>{const file=event.target.files?.[0];if(!file)return;setLoading(true);setError('');try{const next=await read(file);void devicePdf.current?.loadingTask.destroy();devicePdf.current=next;setSourceFile(file);setPdf(next);setPage(1);setRotation(0);}catch{setError('This device PDF could not be opened.');}finally{setLoading(false);}}}/></label>
   </div>
   <div className="overflow-auto flex-1 bg-slate-100 p-3"><p className="mb-2">Take a screenshot here, then close this reader and paste it into the 2D panel. You can also import the whole page.</p>{loading&&<p>Loading the requested PDF pages…</p>}{error&&<div role="alert">{error} <button className="underline text-blue-700" onClick={()=>{retryManualPdf(id,klass,subject);setAttempt(value=>value+1);}}>Retry</button></div>}<canvas ref={canvas} className="mx-auto bg-white shadow max-w-none" style={{display:pdf?'block':'none',width:pdf?`${zoom*100}%`:undefined,maxWidth:zoom<=1?'100%':undefined}}/></div>
  </div>
 </div>,document.body);
}
