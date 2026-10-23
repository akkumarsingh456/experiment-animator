import {useLayoutEffect,useRef,useState} from 'react';
import type {Slide} from '@/lib/generate.functions';
import {NextClassPlanPage} from './NextClassPlanPage';

export function NextClassPlanCanvas({slide,index,total,klass,subject}:{slide:Slide;index:number;total:number;klass?:string;subject?:string}){
 const stage=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null),[scale,setScale]=useState(1);
 useLayoutEffect(()=>{const box=stage.current,node=content.current;if(!box||!node)return;const fit=()=>setScale(Math.min(1,box.clientHeight/Math.max(1,node.scrollHeight)));fit();const observer=new ResizeObserver(fit);observer.observe(box);observer.observe(node);return()=>observer.disconnect();},[slide]);
 return <div className="lesson-slide-canvas next-class-plan-canvas flex h-[calc(100dvh-7rem)] min-h-[560px] flex-col overflow-hidden rounded-xl border bg-white shadow-sm"><header className="flex shrink-0 justify-between border-b bg-sky-50 px-6 py-3 text-xs text-slate-600"><span>Slide {index+1} / {total}</span><span>Teacher’s next class plan</span></header><div ref={stage} className="relative min-h-0 flex-1 overflow-hidden"><div ref={content} className="absolute left-0 top-0 w-full" style={{transform:`scale(${scale})`,transformOrigin:'top left'}}><NextClassPlanPage slide={slide} klass={klass} subject={subject}/></div></div></div>;
}
