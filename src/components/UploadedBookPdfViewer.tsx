import {useEffect,useRef,useState} from "react";
import {loadPdfjs} from "@/lib/pdf-extract";
import type {PDFDocumentProxy} from "pdfjs-dist";
import {X,ZoomIn,ZoomOut,ChevronLeft,ChevronRight} from "lucide-react";

export function UploadedBookPdfViewer({url,name,onClose}:{url:string;name:string;onClose:()=>void}){
 const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null);
 const [page,setPage]=useState(1),[pages,setPages]=useState(0),[zoom,setZoom]=useState(1);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const canvas=useRef<HTMLCanvasElement>(null),scroller=useRef<HTMLDivElement>(null),wheelTarget=useRef(0),frame=useRef<number|null>(null);
 useEffect(()=>{let cancelled=false;let doc:PDFDocumentProxy|null=null;setLoading(true);setError("");
  void (async()=>{const response=await fetch(url);if(!response.ok)throw new Error("The signed PDF link expired or the file could not be downloaded. Close this preview and try Open again.");const bytes=new Uint8Array(await response.arrayBuffer());const lib=await loadPdfjs();doc=await lib.getDocument({data:bytes}).promise;if(cancelled){await doc.destroy();return;}setPdf(doc);setPages(doc.numPages);setPage(1);})().catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:"This PDF could not be opened.");}).finally(()=>{if(!cancelled)setLoading(false);});
  return()=>{cancelled=true;void doc?.destroy();};
 },[url]);
 useEffect(()=>{let cancelled=false;let task:{cancel:()=>void}|undefined;if(!pdf||!canvas.current)return;
  void pdf.getPage(page).then(p=>{if(cancelled||!canvas.current)return;const viewport=p.getViewport({scale:1.2*zoom});const target=canvas.current;target.width=Math.ceil(viewport.width);target.height=Math.ceil(viewport.height);target.style.width=viewport.width+"px";target.style.height=viewport.height+"px";const ctx=target.getContext("2d");if(!ctx)throw new Error("PDF canvas is unavailable.");const render=p.render({canvas:target,canvasContext:ctx,viewport});task=render;return render.promise;}).then(()=>{if(!cancelled){wheelTarget.current=0;scroller.current?.scrollTo({top:0,left:0,behavior:"auto"});}}).catch(e=>{if(!cancelled&&e?.name!=="RenderingCancelledException")setError("This PDF page could not be rendered.");});
  return()=>{cancelled=true;task?.cancel();};
 },[pdf,page,zoom]);
 useEffect(()=>()=>{if(frame.current!==null)cancelAnimationFrame(frame.current);},[]);
 function changeZoom(delta:number){setZoom(v=>Math.max(.5,Math.min(3,Math.round((v+delta)*100)/100)));}
 return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-2 sm:p-5" role="dialog" aria-modal="true" aria-label={"PDF preview: "+name} onKeyDown={e=>{if(e.key==="Escape")onClose();if(e.key==="ArrowLeft")setPage(v=>Math.max(1,v-1));if(e.key==="ArrowRight")setPage(v=>Math.min(pages,v+1));}}>
  <section className="flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
   <header className="flex flex-wrap items-center gap-3 border-b px-3 py-3"><strong className="min-w-0 flex-1 truncate text-sm">{name}</strong><button type="button" onClick={()=>changeZoom(-.15)} aria-label="Zoom out" className="rounded border p-2"><ZoomOut size={17}/></button><span className="min-w-12 text-center text-xs tabular-nums">{Math.round(zoom*100)}%</span><button type="button" onClick={()=>changeZoom(.15)} aria-label="Zoom in" className="rounded border p-2"><ZoomIn size={17}/></button><button type="button" onClick={onClose} aria-label="Close PDF preview" className="rounded border p-2"><X size={18}/></button></header>
   <div className="flex items-center justify-center gap-3 border-b px-3 py-2"><button type="button" disabled={!pdf||page<=1} onClick={()=>setPage(v=>Math.max(1,v-1))} aria-label="Previous PDF page" className="rounded border p-2 disabled:opacity-40"><ChevronLeft size={17}/></button><span className="text-xs tabular-nums">Page {page} of {pages||"—"}</span><button type="button" disabled={!pdf||page>=pages} onClick={()=>setPage(v=>Math.min(pages,v+1))} aria-label="Next PDF page" className="rounded border p-2 disabled:opacity-40"><ChevronRight size={17}/></button><span className="ml-auto hidden text-xs text-muted-foreground sm:block">Ctrl + mouse wheel to zoom · Scroll to read</span></div>
   <div ref={scroller} className="min-h-0 flex-1 overflow-auto overscroll-contain bg-slate-100 p-3" onWheel={e=>{const el=scroller.current;if(!el)return;if(e.ctrlKey||e.metaKey){e.preventDefault();changeZoom(e.deltaY>0?-.1:.1);return;}e.preventDefault();wheelTarget.current=Math.max(0,Math.min(el.scrollHeight-el.clientHeight,Math.max(el.scrollTop,wheelTarget.current)+e.deltaY*.55));if(frame.current===null)frame.current=requestAnimationFrame(()=>{if(scroller.current)scroller.current.scrollTop=wheelTarget.current;frame.current=null;});}}>
    {loading&&<p role="status" className="p-6 text-center text-sm">Opening uploaded PDF…</p>}
    {error&&<p role="alert" className="m-4 rounded border border-amber-300 bg-amber-50 p-4 text-sm">{error}</p>}
    {pdf&&<div className="mx-auto w-fit bg-white shadow"><canvas ref={canvas} className="block"/></div>}
   </div>
  </section>
 </div>;
}
