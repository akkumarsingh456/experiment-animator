import {useEffect,useRef,useState} from 'react';
import {ImagePlus,Save,Move,RotateCcw} from 'lucide-react';
import {toast} from 'sonner';
import {loadManualVisuals,manualVisualCache,saveManualVisual,type ManualVisual} from '@/lib/manual-visuals';

export function ManualVisualEditor({storageKey,autoUrl,alt}:{storageKey:string;autoUrl:string;alt:string}){
 const [visual,setVisual]=useState<ManualVisual|null>(()=>manualVisualCache.get(storageKey)||null);
 const [open,setOpen]=useState(false),[saving,setSaving]=useState(false);
 const input=useRef<HTMLInputElement>(null),panel=useRef<HTMLDivElement>(null);
 const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
 useEffect(()=>{let cancelled=false;loadManualVisuals().then(()=>{if(!cancelled)setVisual(manualVisualCache.get(storageKey)||null);}).catch(()=>toast.error('Saved images could not be loaded.'));return()=>{cancelled=true;};},[storageKey]);
 async function upload(file?:File){
  if(!file)return;if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>12*1024*1024){toast.error('Choose a PNG, JPG or WebP image up to 12 MB.');return;}
  try{const url=URL.createObjectURL(file);const image=new Image();try{image.src=url;await image.decode();const scale=Math.min(1,1600/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);setVisual({url:canvas.toDataURL('image/png'),width:85,x:7,y:8,shape:'rectangle',showAuto:false});setOpen(true);}finally{URL.revokeObjectURL(url);}}catch{toast.error('This image could not be opened.');}
 }
 function change(patch:Partial<ManualVisual>){setVisual(current=>current?{...current,...patch}:current);}
 async function save(){setSaving(true);try{await saveManualVisual(storageKey,visual);setOpen(false);toast.success('Image and layout saved on this device.');}catch{toast.error('Image could not be saved. Device storage may be full.');}finally{setSaving(false);}}
 return <div ref={panel} className="manual-visual-editor relative w-full h-full min-h-0" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();void upload(event.dataTransfer.files[0]);}}>
   {(!visual||visual.showAuto)&&<img className="w-full h-full object-contain" src={autoUrl} alt={alt}/>}
   {visual&&<div className="absolute overflow-hidden" style={{left:`${visual.x}%`,top:`${visual.y}%`,width:`${visual.width}%`,maxHeight:'90%',borderRadius:visual.shape==='circle'?'50%':visual.shape==='rounded'?16:0,aspectRatio:visual.shape==='circle'?'1':undefined,cursor:open?'move':'default',touchAction:open?'none':undefined}}
     onPointerDown={event=>{if(!open)return;event.currentTarget.setPointerCapture(event.pointerId);drag.current={x:event.clientX,y:event.clientY,left:visual.x,top:visual.y};}}
     onPointerMove={event=>{if(!drag.current||!panel.current)return;const bounds=panel.current.getBoundingClientRect();change({x:Math.max(0,Math.min(100-visual.width,drag.current.left+(event.clientX-drag.current.x)/bounds.width*100)),y:Math.max(0,Math.min(85,drag.current.top+(event.clientY-drag.current.y)/bounds.height*100))});}}
     onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
     <img src={visual.url} alt="Manually uploaded topic reference" draggable={false} className="w-full h-full object-contain"/>
   </div>}
   <div className="manual-image-controls absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 rounded-lg bg-white/95 p-2 border text-[11px] shadow">
     <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event=>{void upload(event.target.files?.[0]);event.target.value='';}}/>
     <button onClick={()=>input.current?.click()} title="Import a picture from your device" className="flex items-center gap-1"><ImagePlus size={15}/> Import image</button>
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
 </div>;
}
