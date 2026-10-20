import type {ExperimentActivity} from './experiment-activities';

export type ExperimentScene={kind:'intro'|'safety'|'step'|'observation'|'conclusion';title:string;text:string;drawingStep:number;duration:number;start:number};
/** Whole-word caption pages; every source word remains in the playback. */
export function experimentCaptions(text:string){
 const pages:string[]=[];let page='';
 for(const word of text.trim().split(/\s+/).filter(Boolean)){
  if(page&&(page+' '+word).length>112){pages.push(page);page=word;}else page=page?`${page} ${word}`:word;
 }
 if(page)pages.push(page);return pages;
}
export function experimentTimeline(activity:ExperimentActivity):ExperimentScene[]{
 const items:Array<Omit<ExperimentScene,'start'|'duration'>>=[{kind:'intro',title:'Aim and apparatus',text:[activity.objective,activity.apparatus.length?`Apparatus: ${activity.apparatus.join(', ')}.`:''].filter(Boolean).join(' '),drawingStep:0}];
 if(activity.precautions?.length)items.push({kind:'safety',title:'Before you begin',text:activity.precautions.join(' '),drawingStep:0});
 activity.steps.forEach((step,index)=>items.push({kind:'step',title:step.title,text:step.description,drawingStep:index}));
 items.push({kind:'observation',title:'What to observe',text:activity.observation,drawingStep:activity.steps.length},{kind:'conclusion',title:'Explain the result',text:activity.conclusion,drawingStep:activity.steps.length});
 let start=0;
 return items.map(item=>{const duration=Math.max(6,experimentCaptions(item.text).reduce((sum,page)=>sum+Math.max(4,page.split(/\s+/).length/2.2+1),0));const scene={...item,start,duration};start+=duration;return scene;});
}
export function experimentCaptionAt(text:string,phase:number,duration:number){
 const pages=experimentCaptions(text);if(!pages.length)return '';
 const weights=pages.map(page=>Math.max(4,page.split(/\s+/).length/2.2+1));const total=weights.reduce((a,b)=>a+b,0);
 const position=Math.max(0,Math.min(1,phase/Math.max(1,duration)))*total;let end=0;
 for(let i=0;i<pages.length;i++){end+=weights[i];if(position<end)return pages[i];}return pages[pages.length-1];
}
