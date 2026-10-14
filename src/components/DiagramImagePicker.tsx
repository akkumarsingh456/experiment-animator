import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Search,ExternalLink,X,ImagePlus} from 'lucide-react';
import {searchFreeDiagrams,type DiagramResult} from '@/lib/diagram-search.functions';
import {googleDiagramUrl} from '@/lib/manual-image-import';

export function DiagramImagePicker({query:initialQuery,onClose,onUse,onPaste,onDrop}:{query:string;onClose:()=>void;onUse:(image:DiagramResult)=>Promise<void>;onPaste:(event:React.ClipboardEvent)=>void;onDrop:(event:React.DragEvent)=>void}){
 const [query,setQuery]=useState(initialQuery),[images,setImages]=useState<DiagramResult[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[importing,setImporting]=useState('');
 const request=useRef(0);
 async function search(value:string){const id=++request.current;setLoading(true);setError('');setImages([]);try{const result=await searchFreeDiagrams({data:{query:value.trim()}});if(id===request.current)setImages(result);}catch{if(id===request.current)setError('The free diagram preview could not load. You can still open Google Images and paste an image.');}finally{if(id===request.current)setLoading(false);}}
 useEffect(()=>{void search(initialQuery);const close=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};document.addEventListener('keydown',close);return()=>{request.current++;document.removeEventListener('keydown',close);};},[]);
 async function use(image:DiagramResult){setImporting(image.url);try{await onUse(image);}finally{setImporting('');}}
 return createPortal(<div className="manual-image-controls fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
  <div role="dialog" aria-modal="true" aria-label="Check Google and import a topic diagram" className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onPaste={onPaste} onDragOver={event=>event.preventDefault()} onDrop={onDrop}>
    <div className="flex items-center justify-between border-b p-4"><div><h3 className="font-semibold">Check Google · topic diagrams</h3><p className="mt-1 text-xs text-slate-500">Choose a free diagram here, or search Google and paste your chosen image.</p></div><button aria-label="Close image search" onClick={onClose} className="rounded p-2"><X size={20}/></button></div>
    <div className="border-b p-4"><form className="flex gap-2" onSubmit={event=>{event.preventDefault();if(query.trim().length>1)void search(query);}}><input autoFocus aria-label="Diagram search topic" className="min-w-0 flex-1 rounded-lg border p-2 text-sm" value={query} maxLength={220} onChange={event=>setQuery(event.target.value)}/><button disabled={loading||query.trim().length<2} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm text-white"><Search size={16}/>{loading?'Searching…':'Preview diagrams'}</button></form>
      <div className="mt-3 flex flex-wrap items-center gap-3"><a className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-blue-700" href={googleDiagramUrl(query)} target="_blank" rel="noopener noreferrer" onClick={event=>{event.preventDefault();window.open(googleDiagramUrl(query),'_blank','noopener,noreferrer,width=1100,height=780');}}><ExternalLink size={16}/> Open Google Images window</a><span className="text-xs text-slate-500">Diagram / line-art search · SafeSearch</span></div>
      {!loading&&images.length>0&&<button disabled={!!importing} onClick={()=>void use(images[0])} className="mt-3 rounded-lg bg-emerald-700 px-3 py-2 text-xs text-white">{importing?'Importing…':'One-click import · first diagram preview'}</button>}
      <p className="mt-3 text-xs leading-relaxed text-slate-600">Google opens in its own searchable window because it blocks embedded search. Google controls its results and ads. This in-app preview uses Wikimedia Commons diagrams and has no advertisements.</p>
    </div>
    <div className="overflow-auto p-4"><div className="mb-4 rounded-xl border-2 border-dashed bg-blue-50 p-4 text-sm text-slate-700" tabIndex={0}>Drop an image here, or use <strong>Copy image</strong> in Google, click here and press <strong>Ctrl+V</strong>. If a site blocks dragging, paste a screenshot instead.</div>
      {error&&<p role="alert" className="mb-4 text-sm text-amber-800">{error}</p>}
      {!loading&&!error&&!images.length&&<p className="p-6 text-center text-sm text-slate-500">No diagram preview was found. Try a shorter topic name or open Google Images.</p>}
      {loading&&<p role="status" className="p-6 text-center text-sm">Finding diagram previews…</p>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{images.map(image=><article key={image.page} className="overflow-hidden rounded-xl border"><img src={image.url} alt={image.title} className="h-44 w-full bg-slate-50 object-contain p-2" loading="lazy" draggable onDragStart={event=>{event.dataTransfer.setData('text/uri-list',image.url);event.dataTransfer.setData('application/x-eduplan-diagram',JSON.stringify(image));}}/><div className="p-3"><p className="line-clamp-2 text-xs font-medium">{image.title}</p><p className="mt-1 text-[10px] text-slate-500">{image.license} · Wikimedia Commons</p><button disabled={!!importing} onClick={()=>void use(image)} className="mt-3 flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-2 text-xs text-white"><ImagePlus size={14}/>{importing===image.url?'Importing…':'Use this diagram'}</button><a href={image.page} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs text-blue-700 underline">Preview source & licence</a></div></article>)}</div>
    </div>
    <div className="border-t p-3 text-xs text-slate-500">Check labels and scientific accuracy before importing. Use Save image in the editor to retain your changes.</div>
  </div>
 </div>,document.body);
}
