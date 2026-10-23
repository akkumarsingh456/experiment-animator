import {getSharedTopicVisual,preserveTopicVisual,sharedVisualRecords} from '@/lib/shared-topic-visual-client';
import {sharedVisualKey} from '@/lib/shared-topic-visual';
import {cachedManualBookLinks} from "@/lib/manual-book-links-cache";
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ImagePlus,Save,Move,RotateCcw,BookOpen,Search,Crop} from 'lucide-react';
import {loadManualBookLinks} from '@/lib/manual-book-links.functions';
import {ManualBookPdfViewer} from '@/components/ManualBookPdfViewer';
import {cachedManualPdf} from '@/lib/manual-pdf-cache';
import {toast} from 'sonner';
import {loadManualVisuals,manualVisualCache,saveManualVisual,type ManualVisual} from '@/lib/manual-visuals';
import {canImportMedEasy,topicDiagramQuery,transferredImageUrls,imageWithCredit,type ImageCredit} from '@/lib/manual-image-import';
import {importDiagramUrl,type DiagramResult} from '@/lib/diagram-search.functions';
import {DiagramImagePicker} from './DiagramImagePicker';
import {ManualImageCropper} from './ManualImageCropper';
import {ImageVerticalPosition} from './ImageVerticalPosition';

export function ManualVisualEditor({storageKey:legacyStorageKey,autoUrl,autoContent,alt,klass='',subject='',chapter='',topic='',slideId='',sharedSlideId,previousSharedSlideId,displaySlideNumber,autoSaveDevice=false,privateOnly=false}:{storageKey:string;autoUrl:string;autoContent?:ReactNode;alt:string;klass?:string;subject?:string;chapter?:string;topic?:string;slideId?:string;sharedSlideId?:string;previousSharedSlideId?:string;displaySlideNumber?:number;autoSaveDevice?:boolean;privateOnly?:boolean}){
 const sharedScope={klass,subject,chapter,topic,slideId:sharedSlideId||slideId},sharedKey=sharedVisualKey(sharedScope);
 const scoped=[klass,subject,chapter,topic,slideId].every(value=>value.trim()),shareAllowed=scoped&&!privateOnly;
 const storageKey=scoped&&sharedSlideId?`topic-visual:${sharedKey}`:legacyStorageKey;
 const exactPage=sharedSlideId?.startsWith('page:');
 const [previousVisual,setPreviousVisual]=useState<ManualVisual|null>(null);
 const [visual,setVisual]=useState<ManualVisual|null>(()=>manualVisualCache.get(storageKey)||null);
 const [imageAspect,setImageAspect]=useState(1);
 const [toolsVisible,setToolsVisible]=useState(()=>!manualVisualCache.has(storageKey));
 const [open,setOpen]=useState(false),[saving,setSaving]=useState(false);
 const [googleOpen,setGoogleOpen]=useState(false),[cropOpen,setCropOpen]=useState(false),[importing,setImporting]=useState(false);
 const [preserve,setPreserve]=useState(false),[sharedState,setSharedState]=useState<'loading'|'saved'|'none'|'error'>('loading');
 const dirty=useRef(false);
 const [deviceSaveStatus,setDeviceSaveStatus]=useState('');
 const imageSaving=useRef(false),imageRevision=useRef(0);
 const imageSavePending=useRef<{key:string;chosen:ManualVisual|null;revision:number}|null>(null);
 const medEasyAllowed=canImportMedEasy(klass,subject),currentKey=useRef(storageKey);currentKey.current=storageKey;
 const [bookOpen,setBookOpen]=useState(false),[bookLoading,setBookLoading]=useState(false),[bookError,setBookError]=useState('');
 const [books,setBooks]=useState<Awaited<ReturnType<typeof loadManualBookLinks>>>([]);
 const [viewer,setViewer]=useState<{id:string;name:string;page:number;pages?:number[];printedRange?:{start:number;end:number}}|null>(null);
 const input=useRef<HTMLInputElement>(null),panel=useRef<HTMLDivElement>(null);
 const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
 useEffect(()=>{
  let cancelled=false,hadLocal=false;dirty.current=false;setPreviousVisual(null);setPreserve(false);setToolsVisible(!manualVisualCache.has(storageKey));setOpen(false);setVisual(manualVisualCache.get(storageKey)||null);setSharedState(shareAllowed?'loading':'none');
  const applyShared=()=>{if(!shareAllowed)return;const record=sharedVisualRecords.get(sharedKey);if(record&&!dirty.current&&!hadLocal){setVisual(record.visual);setToolsVisible(false);manualVisualCache.set(storageKey,record.visual);setSharedState('saved');window.dispatchEvent(new Event('manual-visual-saved'));}};
  const changed=(event:Event)=>{if((event as CustomEvent).detail?.key===sharedKey)applyShared();};
  window.addEventListener('shared-topic-visual-saved',changed);
  void(async()=>{
   try{await loadManualVisuals();}catch{/* Sharing remains available without device storage. */}
   if(cancelled)return;
   const local=manualVisualCache.get(storageKey)||(!exactPage?manualVisualCache.get(legacyStorageKey):undefined);hadLocal=!!local;if(!dirty.current){setVisual(local||null);setToolsVisible(!local);}
   if(!shareAllowed)return;
   try{let record=await getSharedTopicVisual(sharedScope);
    if(!record&&exactPage){
     let previous=manualVisualCache.get(legacyStorageKey)||null;
     for(const oldId of [previousSharedSlideId,slideId].filter((id):id is string=>!!id)){
      const oldScope={...sharedScope,slideId:oldId};
      previous ||= manualVisualCache.get(`topic-visual:${sharedVisualKey(oldScope)}`)||(await getSharedTopicVisual(oldScope))?.visual||null;
      if(previous)break;
     }
     if(!cancelled)setPreviousVisual(previous);
    }else if(!record&&sharedSlideId&&sharedSlideId!==slideId){record=await getSharedTopicVisual({...sharedScope,slideId});if(record)sharedVisualRecords.set(sharedKey,record);}
    if(cancelled)return;setSharedState(record?'saved':'none');
    // Retain a pre-existing personal image. Offer an explicit way to use the shared version.
    if(!local&&!dirty.current)applyShared();
   }catch{if(!cancelled)setSharedState('error');}
  })();
  return()=>{cancelled=true;window.removeEventListener('shared-topic-visual-saved',changed);};
 },[storageKey,sharedKey,shareAllowed]);
 useEffect(()=>{setGoogleOpen(false);setCropOpen(false);setBookOpen(false);setViewer(null);},[storageKey]);
 // Only newly added teacher slides opt into automatic device saving. Never
 // enable shared publication or change the existing explicit save permission.
 useEffect(()=>{
  if(!autoSaveDevice||!dirty.current)return;
  const key=storageKey,chosen=visual,revision=++imageRevision.current;
  setDeviceSaveStatus('Saving image…');
  imageSavePending.current={key,chosen,revision};
  if(imageSaving.current)return;
  imageSaving.current=true;
  void(async()=>{try{while(imageSavePending.current){const next=imageSavePending.current;imageSavePending.current=null;try{await saveManualVisual(next.key,next.chosen);if(currentKey.current===next.key&&imageRevision.current===next.revision)setDeviceSaveStatus('Image saved on this device');}catch{if(currentKey.current===next.key&&imageRevision.current===next.revision)setDeviceSaveStatus('Image saving failed — use Save on this device to retry.');}}}finally{imageSaving.current=false;}})();
 },[visual,storageKey,autoSaveDevice]);
 async function upload(file?:File,credit?:ImageCredit){
  if(!file)return;if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>12*1024*1024){toast.error('Choose a PNG, JPG or WebP image up to 12 MB.');return;}
  const key=storageKey;dirty.current=true;setPreserve(false);
  try{const url=URL.createObjectURL(file);const image=new Image();try{image.src=url;await image.decode();if(currentKey.current!==key)return;const scale=Math.min(1,1600/Math.max(image.width,image.height));setVisual({url:imageWithCredit(image,Math.round(image.width*scale),Math.round(image.height*scale),credit),width:96,x:2,y:2,shape:'rectangle',showAuto:false,credit});setOpen(true);setToolsVisible(true);setBookOpen(false);setGoogleOpen(false);setCropOpen(false);panel.current?.focus();}finally{URL.revokeObjectURL(url);}}catch{toast.error('This image could not be opened.');}
 }
 async function importUrl(url:string,credit?:ImageCredit){const key=storageKey;const result=/^data:image\/(png|jpeg|webp);base64,/i.test(url)?{dataUrl:url,type:url.slice(5,url.indexOf(';'))}:await importDiagramUrl({data:{url}});if(currentKey.current!==key)return;const blob=await (await fetch(result.dataUrl)).blob();await upload(new File([blob],'topic-diagram.png',{type:result.type}),credit);}
 async function useDiagram(image:DiagramResult){setImporting(true);try{await importUrl(image.url,image);}catch(error){toast.error(error instanceof Error?error.message:'The image could not be imported. Try copying the image or a screenshot.');}finally{setImporting(false);}}
 function paste(event:React.ClipboardEvent){const file=[...event.clipboardData.items].find(item=>item.type.startsWith('image/'))?.getAsFile();if(file){event.preventDefault();event.stopPropagation();void upload(file);}}
 function drop(event:React.DragEvent){event.preventDefault();event.stopPropagation();const file=[...event.dataTransfer.files].find(file=>file.type.startsWith('image/'));if(file){void upload(file);return;}const urls=transferredImageUrls(event.dataTransfer);let credit:ImageCredit|undefined;
  try{const item=JSON.parse(event.dataTransfer.getData('application/x-eduplan-diagram'));if(/^https:\/\/(?:upload|thumb)\.wikimedia\.org\//.test(item.url||'')&&item.page?.startsWith('https://commons.wikimedia.org/')&&['title','page','author','license','licenseUrl'].every(field=>typeof item[field]==='string'&&item[field].length<2000))credit=item;}catch{/* Ordinary browser image drags have no application metadata. */}
  if(!urls.length){toast.error('Drop an image file, or use Copy image and Ctrl+V.');return;}setImporting(true);void(async()=>{for(const url of urls){try{await importUrl(url,credit);return;}catch{/* Try an alternate image URL included by the browser. */}}toast.error('This website blocks direct image dragging. Use Copy image or paste a screenshot.');})().finally(()=>setImporting(false));
 }
 function change(patch:Partial<ManualVisual>){dirty.current=true;setVisual(current=>current?{...current,...patch}:current);}
 async function save(){
  if(!visual)return;const key=storageKey,scope=sharedScope,chosen=visual,share=preserve;
  setSaving(true);
  try{
   if(share){await preserveTopicVisual(scope,chosen);if(currentKey.current===key)setSharedState('saved');}
   try{await saveManualVisual(key,chosen);}catch{if(!share)throw new Error('Image could not be saved. Device storage may be full.');}
   if(currentKey.current===key){dirty.current=false;setOpen(false);setToolsVisible(false);setPreserve(false);if(autoSaveDevice)setDeviceSaveStatus('Image saved on this device');}
   toast.success(share?'Image preserved for everyone on this exact chapter, topic and slide.':'Image and layout saved on this device.');
  }catch(error){toast.error(error instanceof Error?error.message:'The image could not be saved.');}finally{setSaving(false);}
 }
 async function openBooks(){if(!medEasyAllowed)return;setBookOpen(value=>!value);if(bookOpen)return;setBookLoading(true);setBookError('');try{const requestedKey=currentKey.current;const result=await cachedManualBookLinks({klass,subject,chapter,topic});if(currentKey.current!==requestedKey)return;setBooks(result);if(result[0])void cachedManualPdf(result[0].id,klass,subject).catch(()=>{});}catch{setBookError('Book links are unavailable. You can still paste a screenshot or import from your device.');}finally{setBookLoading(false);}}
 const manualOnly=!!visual&&!visual.showAuto;
 const automaticText=!!autoContent&&!visual;
 return <div ref={panel} tabIndex={0} aria-label="Topic image editor: click here and paste a screenshot" className={`manual-visual-editor relative w-full min-h-0 ${manualOnly?'manual-visual-only':automaticText?'manual-text-visual h-full flex flex-col':'h-full'}`} onPaste={paste} onDragOver={event=>event.preventDefault()} onDrop={drop}>
   {autoSaveDevice&&deviceSaveStatus&&<p role="status" className="manual-image-controls absolute left-2 top-2 z-20 rounded bg-white/95 px-2 py-1 text-xs print:hidden">{deviceSaveStatus}</p>}
   <div className={manualOnly?'manual-image-stage relative w-full overflow-hidden':automaticText?'manual-text-stage relative min-h-0 flex-1 overflow-auto':'absolute inset-0'} style={manualOnly?{aspectRatio:String(visual.shape==='circle'?1:imageAspect)}:undefined}>
   {(!visual||visual.showAuto)&&(autoContent||<img className="w-full h-full object-contain" src={autoUrl} alt={alt}/>)}
   {visual&&<div className="absolute overflow-hidden" style={{left:`${visual.x}%`,top:`${visual.y}%`,width:`${visual.width}%`,height:visual.shape==='circle'?undefined:`${Math.max(1,100-visual.y)}%`,borderRadius:visual.shape==='circle'?'50%':visual.shape==='rounded'?16:0,aspectRatio:visual.shape==='circle'?'1':undefined,cursor:open?'move':'default',touchAction:open?'none':undefined}}
     onPointerDown={event=>{if(!open)return;event.currentTarget.setPointerCapture(event.pointerId);drag.current={x:event.clientX,y:event.clientY,left:visual.x,top:visual.y};}}
     onPointerMove={event=>{if(!drag.current)return;const bounds=event.currentTarget.parentElement!.getBoundingClientRect();change({x:Math.max(0,Math.min(100-visual.width,drag.current.left+(event.clientX-drag.current.x)/bounds.width*100)),y:Math.max(0,Math.min(85,drag.current.top+(event.clientY-drag.current.y)/bounds.height*100))});}}
     onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
     <img src={visual.url} alt="Manually uploaded topic reference" draggable={false} onLoad={event=>{const image=event.currentTarget;if(image.naturalWidth&&image.naturalHeight)setImageAspect(image.naturalWidth/image.naturalHeight);}} className="w-full h-full object-contain object-top" style={visual.shape==='circle'?{height:'auto',aspectRatio:'1'}:undefined}/>
   </div>}
   </div>
   {visual&&<ImageVerticalPosition key={storageKey} scope={storageKey}/>}
   {visual&&<button type="button" className={`manual-image-toggle absolute right-2 top-2 z-20 ${toolsVisible?'':'manual-image-toggle-pulse'}`} aria-label={toolsVisible?'Hide image options':'Show image options'} aria-expanded={toolsVisible} title={toolsVisible?'Hide image options':'Image options: import, search, crop and save'} onClick={()=>{setToolsVisible(value=>!value);setOpen(false);setBookOpen(false);}}><ImagePlus size={19}/></button>}
   {toolsVisible&&<div className={`manual-image-controls ${manualOnly||automaticText?'relative m-2 shrink-0':'absolute bottom-2 left-2 right-2'} flex flex-wrap gap-2 rounded-lg bg-white/95 p-3 border text-[13px] shadow`}>
     <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event=>{void upload(event.target.files?.[0]);event.target.value='';}}/>
     <button onClick={()=>input.current?.click()} title="Import a picture from your device" className="flex items-center gap-1"><ImagePlus size={15}/> From device</button>
     {medEasyAllowed&&<button onClick={()=>void openBooks()} className="flex items-center gap-1"><BookOpen size={15}/> From Med Easy book</button>}
     <button onClick={()=>{setBookOpen(false);setGoogleOpen(true);}} className="flex items-center gap-1"><Search size={15}/> Check Google</button>
     {importing&&<span role="status">Importing diagram…</span>}
     {bookOpen&&medEasyAllowed&&<div className="w-full border-t pt-2 max-h-36 overflow-auto">
       <p>Open the PDF, capture the picture, then click this panel and press Ctrl+V.</p>
       {bookLoading?<p>Finding saved chapter pages…</p>:bookError?<p>{bookError}</p>:!books.length?<p>No matching Med Easy book is available for this class and subject.</p>:books.map(book=><div key={book.id} className="mt-2">
         <button onClick={()=>setViewer({id:book.id,name:book.name,page:book.pages[0]?.page||1,pages:book.pages.map(item=>item.page),printedRange:book.printedRange})} className="underline text-blue-700">View PDF · {book.name}</button>
         {book.pages.length?<div className="flex flex-wrap gap-2 mt-1">{book.pages.map(({page,topic})=><button key={page} onClick={()=>setViewer({id:book.id,name:book.name,page,pages:book.pages.map(item=>item.page),printedRange:book.printedRange})} className="underline">PDF page {page}{topic?' · topic match':''}</button>)}</div>:<p>{book.printedRange?`Contents: printed pages ${book.printedRange.start}–${book.printedRange.end}; PDF numbering may differ.`:'Chapter pages have not been indexed yet. Use the PDF contents to find the chapter.'}</p>}
       </div>)}
     </div>}
     {visual&&<button onClick={()=>setOpen(value=>!value)} className="flex items-center gap-1 ml-2"><Move size={15}/> Size / shape / position</button>}
     {sharedState==='saved'&&<button onClick={()=>{const saved=sharedVisualRecords.get(sharedKey);if(saved){dirty.current=true;setVisual(saved.visual);setOpen(true);}}} className="flex items-center gap-1 text-blue-700">Use preserved image</button>}
     {visual&&<button disabled={saving} onClick={()=>void save()} className="flex items-center gap-1 text-blue-700"><Save size={15}/> {saving?'Saving…':'Preserve / save'}</button>}
     {previousVisual&&<button onClick={()=>{dirty.current=true;setVisual(previousVisual);setOpen(true);setToolsVisible(true);}} className="flex items-center gap-1 text-blue-700">Use earlier topic image on this slide</button>}
     {visual&&<button onClick={()=>setCropOpen(true)} className="flex items-center gap-1"><Crop size={15}/> Crop</button>}
     {open&&visual&&<div className="w-full grid grid-cols-2 gap-2 mt-1">
       <label>Size <input aria-label="Uploaded image size" type="range" min="10" max="100" value={visual.width} onChange={event=>change({width:Number(event.target.value),x:Math.min(visual.x,100-Number(event.target.value))})}/></label>
       <label>Shape <select value={visual.shape} onChange={event=>change({shape:event.target.value as ManualVisual['shape']})}><option value="rectangle">Rectangle</option><option value="rounded">Rounded</option><option value="circle">Circle</option></select></label>
       <label>Horizontal <input type="range" min="0" max={100-visual.width} value={visual.x} onChange={event=>change({x:Number(event.target.value)})}/></label>
       <label>Vertical <input type="range" min="0" max="85" value={visual.y} onChange={event=>change({y:Number(event.target.value)})}/></label>
       <label><input type="checkbox" checked={visual.showAuto} onChange={event=>change({showAuto:event.target.checked})}/> Show automatic diagram</label>
       <div className="col-span-2 rounded border border-blue-200 bg-blue-50 p-2">
         <p className="font-semibold">Preserve this topic image</p>
         <p className="mt-1">{privateOnly?'This plan image stays private to this lecture. Device saving is automatic; use Save to my workspace for a private cloud image backup.':sharedState==='saved'?'A shared image is saved for this slide. Saving for everyone replaces that shared version.':sharedState==='loading'?'Checking for a shared image…':sharedState==='error'?'Shared images could not be loaded. You can still edit and save on this device.':'Keep the cropped image and its layout after refresh, for everyone viewing this exact slide.'}</p>
         <p className="mt-1 break-words">Class {klass} · {subject} · {chapter} · {topic} · Slide {displaySlideNumber??Number(slideId)+1}</p>
         {!privateOnly&&<label className="mt-2 flex items-start gap-2"><input type="checkbox" disabled={!shareAllowed||saving} checked={preserve} onChange={event=>setPreserve(event.target.checked)}/><span>Yes, preserve for everyone. This image belongs to this chapter, topic and slide, and I can share it.</span></label>}
         {!privateOnly&&!shareAllowed&&<p>Open a slide with complete chapter and topic details to share an image.</p>}
       </div>
       <button disabled={saving} onClick={()=>void save()} className="flex items-center gap-1 text-blue-700"><Save size={15}/>{saving?'Saving…':preserve?'Save for everyone':'Save on this device'}</button>
       <button onClick={()=>{dirty.current=true;setPreserve(false);setVisual(null);void saveManualVisual(storageKey,null).then(()=>toast.success('Automatic diagram restored.')).catch(()=>toast.error('Could not remove the saved image.'));}} className="flex items-center gap-1"><RotateCcw size={15}/> Restore automatic</button>
     </div>}
   </div>}
   {viewer&&medEasyAllowed&&<ManualBookPdfViewer id={viewer.id} name={viewer.name} klass={klass} subject={subject} chapter={chapter} suggestedPages={viewer.pages} printedRange={viewer.printedRange} initialPage={viewer.page} onClose={()=>{setViewer(null);panel.current?.focus();}} onImport={file=>void upload(file)}/>}
   {googleOpen&&<DiagramImagePicker query={topicDiagramQuery(klass,subject,chapter,topic)} onClose={()=>{setGoogleOpen(false);panel.current?.focus();}} onUse={useDiagram} onPaste={paste} onDrop={drop}/>}
   {cropOpen&&visual&&<ManualImageCropper url={visual.url} credit={visual.credit} onClose={()=>setCropOpen(false)} onApply={url=>{change({url});setCropOpen(false);setOpen(true);}}/>}
 </div>;
}
