import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {PDFDocumentProxy} from 'pdfjs-dist';
import {openManualBookPdf} from '@/lib/manual-book-links.functions';
import {loadPdfjs} from '@/lib/pdf-extract';
const files=new Map<string,Promise<Blob>>();
export function ManualBookPdfViewer({id,name,klass,subject,initialPage,onClose,onImport}:{id:string;name:string;klass:string;subject:string;initialPage:number;onClose:()=>void;onImport:(file:File)=>void}){
 const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null),[page,setPage]=useState(initialPage),[zoom,setZoom]=useState(1),[error,setError]=useState(''),[loading,setLoading]=useState(true),[rendering,setRendering]=useState(false);
 const canvas=useRef<HTMLCanvasElement>(null);
 async function read(blob:Blob){const library=await loadPdfjs();return library.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise;}
 useEffect(()=>{let cancelled=false;
  const key=`${klass}:${subject}:${id}`;
  if(!files.has(key)){const pending=openManualBookPdf({data:{id,klass,subject}}).then(response=>response.blob()).catch(error=>{files.delete(key);throw error;});files.set(key,pending);if(files.size>2)files.delete(files.keys().next().value!);}
  void files.get(key)!.then(read).then(value=>{if(cancelled){void value.loadingTask.destroy();return;}setPdf(value);setPage(Math.max(1,Math.min(initialPage,value.numPages)));}).catch(()=>{if(!cancelled)setError('The online book could not be loaded. Open a PDF from your device below.');}).finally(()=>{if(!cancelled)setLoading(false);});
  return()=>{cancelled=true;};
 },[id,klass,subject,initialPage]);
 useEffect(()=>()=>{void pdf?.loadingTask.destroy();},[pdf]);
 useEffect(()=>{if(!pdf||!canvas.current)return;let cancelled=false;let task:ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']>|undefined;setRendering(true);
  void pdf.getPage(page).then(value=>{if(cancelled||!canvas.current)return;const viewport=value.getViewport({scale:1.5*zoom});const target=canvas.current;target.width=Math.ceil(viewport.width);target.height=Math.ceil(viewport.height);task=value.render({canvas:target,canvasContext:target.getContext('2d')!,viewport});return task.promise;}).catch(reason=>{if(!cancelled&&reason?.name!=='RenderingCancelledException')setError('This page could not be rendered. Try another page.');}).finally(()=>{if(!cancelled)setRendering(false);});return()=>{cancelled=true;task?.cancel();};
 },[pdf,page,zoom]);
 return createPortal(<div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="View Med Easy PDF">
  <div className="bg-white rounded-xl w-full max-w-5xl h-[92vh] flex flex-col text-sm shadow-xl">
   <div className="p-3 border-b flex flex-wrap items-center gap-3"><strong className="flex-1">View PDF · {name}</strong><button onClick={onClose}>Close ✕</button></div>
   <div className="p-3 border-b flex flex-wrap items-center gap-3">
    <button disabled={!pdf||page<=1} onClick={()=>setPage(value=>value-1)}>← Previous</button>
    <label>PDF page <input className="w-16 border rounded px-2" type="number" min="1" max={pdf?.numPages||1} value={page} disabled={!pdf} onChange={event=>setPage(Math.max(1,Math.min(pdf?.numPages||1,Number(event.target.value)||1)))}/> / {pdf?.numPages||'…'}</label>
    <button disabled={!pdf||page>=pdf.numPages} onClick={()=>setPage(value=>value+1)}>Next →</button>
    <label>Zoom <select value={zoom} onChange={event=>setZoom(Number(event.target.value))}><option value="0.75">75%</option><option value="1">100%</option><option value="1.5">150%</option><option value="2">200%</option></select></label>
    <button disabled={!pdf||rendering} className="text-blue-700 font-medium" onClick={()=>canvas.current?.toBlob(blob=>{if(blob){onImport(new File([blob],`book-page-${page}.png`,{type:'image/png'}));onClose();}},'image/png')}>Use this page image</button>
    <label className="cursor-pointer underline">Open device PDF<input type="file" accept="application/pdf" className="hidden" onChange={async event=>{const file=event.target.files?.[0];if(!file)return;setLoading(true);setError('');try{const next=await read(file);setPdf(next);setPage(1);}catch{setError('This device PDF could not be opened.');}finally{setLoading(false);}}}/></label>
   </div>
   <div className="overflow-auto flex-1 bg-slate-100 p-3"><p className="mb-2">Take a screenshot here, then close this reader and paste it into the 2D panel. You can also import the whole page.</p>{loading&&<p>Loading PDF inside the website…</p>}{error&&<p role="alert">{error}</p>}<canvas ref={canvas} className="mx-auto bg-white shadow max-w-none" style={{display:pdf?'block':'none',width:pdf?`${zoom*100}%`:undefined,maxWidth:zoom<=1?'100%':undefined}}/></div>
  </div>
 </div>,document.body);
}
