import {useEffect,useRef,useState} from "react";
import {ChevronLeft,ChevronRight,Minus,Plus,X,RotateCcw} from "lucide-react";
import {loadPdfjs} from "@/lib/pdf-extract";
import type {PDFDocumentProxy} from "pdfjs-dist";

export function UploadedBookPreview({url,name,onClose}:{url:string;name:string;onClose:()=>void}){
 const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null);
 const [page,setPage]=useState(1);
 const [zoom,setZoom]=useState(1);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const canvas=useRef<HTMLCanvasElement>(null);
 const scroller=useRef<HTMLDivElement>(null);
 useEffect(()=>{let cancelled=false;let doc:PDFDocumentProxy|null=null;setLoading(true);setError("");
  void (async()=>{const response=await fetch(url);if(!response.ok)throw new Error("The signed PDF link expired or the file is unavailable. Close this preview and try Open again.");const bytes=new Uint8Array(await response.arrayBuffer());const library=await loadPdfjs();doc=await library.getDocument({data:bytes}).promise;if(cancelled){await doc.destroy();return;}setPdf(doc);setPage(1);})().catch(reason=>{if(!cancelled)setError(reason instanceof Error?reason.message:"This uploaded PDF could not be opened.");}).finally(()=>{if(!cancelled)setLoading(false);});
  return()=>{cancelled=true;void doc?.destroy();};
 },[url]);
 useEffect(()=>{if(!pdf||!canvas.current)return;let cancelled=false;let task:{cancel:()=>void}|undefined;
  void pdf.getPage(page).then(p=>{if(cancelled||!canvas.current)return;const viewport=p.getViewport({scale:1.2*zoom});const target=canvas.current;target.width=Math.ceil(viewport.width);target.height=Math.ceil(viewport.height);target.style.width=viewport.width+"px";target.style.height=viewport.height+"px";task=p.render({canvas:target,canvasContext:target.getContext("2d")!,viewport});return task.promise;}).catch(reason=>{if(!cancelled&&reason?.name!=="RenderingCancelledException")setError("This PDF page could not be rendered. Please retry.");});
  return()=>{cancelled=true;task?.cancel();};
 },[pdf,page,zoom]);
 function wheel(event:React.WheelEvent<HTMLDivElement>){const area=event.currentTarget;if(event.ctrlKey||event.metaKey){event.preventDefault();setZoom(value=>Math.max(.5,Math.min(3,Number((value+(event.deltaY<0?.1:-.1)).toFixed(2)))));return;}if(Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.deltaY)return;const down=event.deltaY>0;const atBottom=area.scrollTop+area.clientHeight>=area.scrollHeight-2;const atTop=area.scrollTop<=2;if((down&&atBottom&&pdf&&page<pdf.numPages)||(!down&&atTop&&page>1)){event.preventDefault();setPage(value=>Math.max(1,Math.min(pdf!.numPages,value+(down?1:-1))));area.scrollTo({top:0});return;}event.preventDefault();area.scrollTop+=event.deltaY*.55;}
 return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label={"Preview "+name} onKeyDown={event=>{if(event.key==="Escape")onClose();if(event.key==="ArrowLeft")setPage(value=>Math.max(1,value-1));if(event.key==="ArrowRight"&&pdf)setPage(value=>Math.min(pdf.numPages,value+1));}}>
  <section className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
   <header className="flex flex-wrap items-center gap-3 border-b px-3 py-3"><strong className="min-w-0 flex-1 truncate text-sm sm:text-base">{name}</strong><button type="button" title="Zoom out (Ctrl + mouse wheel down)" aria-label="Zoom out" onClick={()=>setZoom(value=>Math.max(.5,Number((value-.1).toFixed(2))))} className="rounded border p-2"><Minus size={17}/></button><span className="min-w-12 text-center text-xs tabular-nums">{Math.round(zoom*100)}%</span><button type="button" title="Zoom in (Ctrl + mouse wheel up)" aria-label="Zoom in" onClick={()=>setZoom(value=>Math.min(3,Number((value+.1).toFixed(2))))} className="rounded border p-2"><Plus size={17}/></button><button type="button" title="Reset zoom" aria-label="Reset zoom" onClick={()=>setZoom(1)} className="rounded border p-2"><RotateCcw size={16}/></button><button type="button" onClick={onClose} aria-label="Close PDF preview" className="rounded border p-2"><X size={17}/></button></header>
   <div className="flex items-center justify-between border-b px-3 py-2"><button type="button" disabled={!pdf||page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))} className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm disabled:opacity-40"><ChevronLeft size={16}/> Previous</button><span className="text-xs text-muted-foreground">PDF page {page} of {pdf?.numPages||"—"}</span><button type="button" disabled={!pdf||page>=pdf.numPages} onClick={()=>setPage(value=>Math.min(pdf!.numPages,value+1))} className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm disabled:opacity-40">Next <ChevronRight size={16}/></button></div>
   <div ref={scroller} onWheel={wheel} className="min-h-0 flex-1 overflow-auto overscroll-contain bg-slate-100 p-4" aria-label="Uploaded PDF page area">{loading&&<p role="status" className="p-6 text-center text-sm">Opening uploaded PDF…</p>}{error&&<p role="alert" className="m-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{error}</p>}<canvas ref={canvas} className="mx-auto bg-white shadow-md" style={{display:pdf&&!error?"block":"none",maxWidth:zoom<=1?"100%":"none"}}/></div>
   <footer className="border-t px-3 py-2 text-xs text-muted-foreground">Scroll at a slower speed. Hold Ctrl (or ⌘ on Mac) and use the mouse wheel to zoom. You can also use the zoom controls above.</footer>
  </section>
 </div>;
}
