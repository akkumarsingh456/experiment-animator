import {useEffect,useRef} from 'react';
import {ArrowUpDown} from 'lucide-react';

/** Device-only placement, independent of image saving and sharing consent. */
export function ImageVerticalPosition({scope}:{scope:string}){
 const handle=useRef<HTMLButtonElement>(null);
 const placement=useRef({ratio:0,travel:0,scale:1,startY:0,startOffset:0,dragging:false});
 const update=useRef<()=>void>(()=>{});
 const key=`eduplan-image-vertical-v1:${scope}`;
 useEffect(()=>{
  const frame=handle.current?.closest<HTMLElement>('.lesson-figure-panel');
  const column=frame?.parentElement;
  if(!frame||!column)return;
  const state=placement.current;
  state.ratio=0;state.dragging=false;
  try{const saved=localStorage.getItem(key);const value=saved===null?0:Number(saved);if(Number.isFinite(value))state.ratio=Math.max(0,Math.min(1,value));}catch{/* Placement remains usable without storage. */}
  const layout=()=>{
   const offset=Number(frame.dataset.verticalOffset||0);
   const rect=frame.getBoundingClientRect();
   state.scale=frame.offsetWidth?rect.width/frame.offsetWidth:1;
   const baseBottom=rect.bottom-offset*state.scale;
   const siblings=Array.from(column.children).filter((element):element is HTMLElement=>element instanceof HTMLElement&&element!==frame&&getComputedStyle(element).position!=='absolute');
   const limits=siblings.map(element=>element.getBoundingClientRect()).filter(bounds=>bounds.height>0&&bounds.top>=baseBottom-1);
   const bottom=Math.min(column.getBoundingClientRect().bottom-12,...limits.map(bounds=>bounds.top-8));
   state.travel=Math.max(0,(bottom-baseBottom)/state.scale);
   const next=state.ratio*state.travel;
   frame.style.transform=`translateY(${next}px)`;
   frame.dataset.verticalOffset=String(next);
  };
  update.current=layout;
  const observer=new ResizeObserver(layout);
  observer.observe(column);observer.observe(frame);
  for(const element of Array.from(column.children))observer.observe(element);
  layout();window.addEventListener('resize',layout);
  return()=>{observer.disconnect();window.removeEventListener('resize',layout);frame.style.removeProperty('transform');delete frame.dataset.verticalOffset;update.current=()=>{};};
 },[key]);
 function remember(){try{localStorage.setItem(key,String(placement.current.ratio));}catch{/* Do not report an image save when only placement storage failed. */}}
 return <button ref={handle} type="button" className="manual-image-toggle manual-image-position absolute right-12 top-2 z-20"
  style={{touchAction:'none',cursor:'ns-resize'}} aria-label="Move image up or down" title="Drag up or down · position saved automatically on this device"
  onPointerDown={event=>{event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);const state=placement.current;state.dragging=true;state.startY=event.clientY;state.startOffset=state.ratio*state.travel;}}
  onPointerMove={event=>{const state=placement.current;if(!state.dragging||!state.travel)return;state.ratio=Math.max(0,Math.min(1,(state.startOffset+(event.clientY-state.startY)/state.scale)/state.travel));update.current();}}
  onPointerUp={()=>{if(placement.current.dragging){placement.current.dragging=false;remember();}}}
  onPointerCancel={()=>{if(placement.current.dragging){placement.current.dragging=false;remember();}}}
  onKeyDown={event=>{if(event.key!=='ArrowUp'&&event.key!=='ArrowDown')return;event.preventDefault();const state=placement.current;state.ratio=Math.max(0,Math.min(1,state.ratio+(event.key==='ArrowDown'?.05:-.05)));update.current();remember();}}>
  <ArrowUpDown size={18}/>
 </button>;
}
