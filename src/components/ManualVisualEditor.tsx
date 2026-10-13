import {useEffect,useRef,useState} from 'react';
import {ImagePlus,Save,Move,RotateCcw,BookOpen} from 'lucide-react';
import {loadManualBookLinks} from '@/lib/manual-book-links.functions';
import {ManualBookPdfViewer} from '@/components/ManualBookPdfViewer';
import {toast} from 'sonner';
import {loadManualVisuals,manualVisualCache,saveManualVisual,type ManualVisual} from '@/lib/manual-visuals';

export function ManualVisualEditor({storageKey,autoUrl,alt,klass='',subject='',chapter='',topic=''}:{storageKey:string;autoUrl:string;alt:string;klass?:string;subject?:string;chapter?:string;topic?:string}){
 const [visual,setVisual]=useState<ManualVisual|null>(()=>manualVisualCache.get(storageKey)||null);
 const [open,setOpen]=useState(false),[saving,setSaving]=useState(false);
 const [bookOpen,setBookOpen]=useState(false),[bookLoading,setBookLoading]=useState(false),[bookError,setBookError]=useState('');
 const [books,setBooks]=useState<Awaited<ReturnType<typeof loadManualBookLinks>>>([]);
 const [viewer,setViewer]=useState<{id:string;name:string;page:number}|null>(null);
 const input=useRef<HTMLInputElement>(null),panel=useRef<HTMLDivElement>(null);
 const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
 useEffect(()=>{let cancelled=false;loadManualVisuals().then(()=>{if(!cancelled)setVisual(manualVisualCache.get(storageKey)||null);}).catch(()=>toast.error('Saved images could not be loaded.'));return()=>{cancelled=true;};},[storageKey]);
 async function upload(file?:File){
  if(!file)return;if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>12*1024*1024){toast.error('Choose a PNG, JPG or WebP image up to 12 MB.');return;}
  try{const url=URL.createObjectURL(file);const image=new Image();try{image.src=url;await image.decode();const scale=Math.min(1,1600/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);setVisual({url:canvas.toDataURL('image/png'),width:85,x:7,y:8,shape:'rectangle',showAuto:false});setOpen(true);setBookOpen(false);panel.current?.focus();}finally{URL.revokeObjectURL(url);}}catch{toast.error('This image could not be opened.');}
 }
 function change(patch:Partial<ManualVisual>){setVisual(current=>current?{...current,...patch}:current);}
 async function save(){setSaving(true);try{await saveManualVisual(storageKey,visual);setOpen(false);toast.success('Image and layout saved on this device.');}catch{toast.error('Image could not be saved. Device storage may be full.');}finally{setSaving(false);}}
 async function openBooks(){setBookOpen(value=>!value);if(bookOpen)return;setBookLoading(true);setBookError('');try{setBooks(await loadManualBookLinks({data:{klass,subject,chapter,topic}}));}catch{setBookError('Book links are unavailable. You can still paste a screenshot or import from your device.');}finally{setBookLoading(false);}}
 return <div ref={panel} tabIndex={0} aria-label="Topic image editor: click here and paste a screenshot" className="manual-visual-editor relative w-full h-full min-h-0" onPaste={event=>{const file=[...event.clipboardData.items].find(item=>item.type.startsWith('image/'))?.getAsFile();if(file){event.preventDefault();void upload(file);}}} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();void upload(event.dataTransfer.files[0]);}}>
   {(!visual||visual.showAuto)&&<img className="w-full h-full object-contain" src={autoUrl} alt={alt}/>}
   {visual&&<div className="absolute overflow-hidden" style={{left:`${visual.x}%`,top:`${visual.y}%`,width:`${visual.width}%`,maxHeight:'90%',borderRadius:visual.shape==='circle'?'50%':visual.shape==='rounded'?16:0,aspectRatio:visual.shape==='circle'?'1':undefined,cursor:open?'move':'default',touchAction:open?'none':undefined}}
     onPointerDown={event=>{if(!open)return;event.currentTarget.setPointerCapture(event.pointerId);drag.current={x:event.clientX,y:event.clientY,left:visual.x,top:visual.y};}}
     onPointerMove={event=>{if(!drag.current||!panel.current)return;const bounds=panel.current.getBoundingClientRect();change({x:Math.max(0,Math.min(100-visual.width,drag.current.left+(event.clientX-drag.current.x)/bounds.width*100)),y:Math.max(0,Math.min(85,drag.current.top+(event.clientY-drag.current.y)/bounds.height*100))});}}
     onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
     <img src={visual.url} alt="Manually uploaded topic reference" draggable={false} className="w-full h-full object-contain"/>
   </div>}
   <div className="manual-image-controls absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 rounded-lg bg-white/95 p-2 border text-[11px] shadow">
     <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event=>{void upload(event.target.files?.[0]);event.target.value='';}}/>
     <button onClick={()=>input.current?.click()} title="Import a picture from your device" className="flex items-center gap-1"><ImagePlus size={15}/> From device</button>
     <button onClick={()=>void openBooks()} className="flex items-center gap-1"><BookOpen size={15}/> From Med Easy book</button>
     {bookOpen&&<div className="w-full border-t pt-2 max-h-36 overflow-auto">
       <p>Open the PDF, capture the picture, then click this panel and press Ctrl+V.</p>
       {bookLoading?<p>Finding saved chapter pages…</p>:bookError?<p>{bookError}</p>:!books.length?<p>No matching Med Easy book is available for this class and subject.</p>:books.map(book=><div key={book.id} className="mt-2">
         <button onClick={()=>setViewer({id:book.id,name:book.name,page:book.pages[0]?.page||1})} className="underline text-blue-700">View PDF · {book.name}</button>
         {book.pages.length?<div className="flex flex-wrap gap-2 mt-1">{book.pages.map(({page,topic})=><button key={page} onClick={()=>setViewer({id:book.id,name:book.name,page})} className="underline">PDF page {page}{topic?' · topic match':''}</button>)}</div>:<p>Chapter pages have not been indexed yet. Use the PDF contents to find the chapter.</p>}
       </div>)}
     </div>}
     {visual&&<button onClick={()=>setOpen(value=>!value)} className="flex items-center gap-1 ml-2"><Move size={15}/> Size / shape / position</button>}
     {open&&visual&&<div className="w-full grid grid-cols-2 gap-2 mt-1">
       <label>Size <input aria-label="Uploaded image size" type="range" min="10" max="100" value={visual.width} onChange={event=>change({width:Number(event.target.value),x:Math.min(visual.x,100-Number(event.target.value))})}/></label>
       <label>Shape <select value={visual.shape} onChange={event=>change({shape:event.target.value as ManualVisual['shape']})}><option value="rectangle">Rectangle</option><option value="rounded">Rounded</option><option value="circle">Circle</option></select></label>
       <label>Horizontal <input type="range" min="0" max={100-visual.width} value={visual.x} onChange={event=>change({x:Number(event.target.value)})}/></label>
       <label>Vertical <input type="range" min="0" max="85" value={visual.y} onChange={event=>change({y:Number(event.target.value)})}/></label>
       <label><input type="checkbox" checked={visual.showAuto} onChange={event=>change({showAuto:event.target.checked})}/> Show automatic diagram</label>
       <button disabled={saving} onClick={()=>void save()} className="flex items-center gap-1 text-blue-700"><Save size={15}/>{saving?'Saving…':'Save image'}</button>
       <button onClick={()=>{setVisual(null);void saveManualVisual(storageKey,null).then(()=>toast.success('Automatic diagram restored.')).catch(()=>toast.error('Could not remove the saved image.'));}} className="flex items-center gap-1"><RotateCcw size={15}/> Restore automatic</button>
     </div>}
   </div>
   {viewer&&<ManualBookPdfViewer id={viewer.id} name={viewer.name} klass={klass} subject={subject} initialPage={viewer.page} onClose={()=>{setViewer(null);panel.current?.focus();}} onImport={file=>void upload(file)}/>}
 </div>;
}
