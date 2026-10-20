import assets from './experiment-photo-assets.json';
import type { ExperimentActivity } from './experiment-activities';
import { drawExperiment } from './experiment-drawing';
import {experimentCaptionAt,type ExperimentScene} from './experiment-timeline';

const labels: Record<string,string> = { ammeter:'Analog ammeter', voltmeter:'Analog panel voltmeter', resistor:'Laboratory resistor', 'resistance-box':'Resistance box', 'test-tubes':'Test tubes and rack', beaker:'Glass beaker', microscope:'Optical microscope', 'onion-cells':'Onion epidermis · microscope photograph', 'bar-magnet':'Bar magnet', battery:'Dry cells', lens:'Convex lens · real inverted image' };
const matches: Record<string,RegExp> = { ammeter:/ammeter/i, voltmeter:/voltmeter/i, resistor:/\bresistor\b/i, 'resistance-box':/resistance box/i, 'test-tubes':/test[ -]?tubes?/i, beaker:/beaker/i, microscope:/microscope/i, 'onion-cells':/onion/i, 'bar-magnet':/magnet/i, battery:/battery|batteries|dry cells?|low.voltage cells/i, lens:/convex lens|convex lenses/i };
export function apparatusPhotos(activity: ExperimentActivity) {
  const apparatus = `${activity.name} ${activity.apparatus.join(' ')}`;
  return assets.filter(photo=>matches[photo.id]?.test(apparatus)||(photo.id==='battery'&&/ammeter|voltmeter/i.test(apparatus)&&/\bcells?\b/i.test(apparatus))).map(photo=>({...photo,label:labels[photo.id]}));
}
export type ApparatusPhoto = ReturnType<typeof apparatusPhotos>[number];
export type PhotoImages = Map<string,HTMLImageElement>;
const cache = new Map<string,Promise<HTMLImageElement|null>>();
export async function loadApparatusPhotos(photos: ApparatusPhoto[]): Promise<PhotoImages> {
  const rows=await Promise.all(photos.map(async photo=>{
    if(!cache.has(photo.file)) cache.set(photo.file,new Promise(resolve=>{
      const image=new Image(); image.onload=()=>resolve(image); image.onerror=()=>{cache.delete(photo.file);resolve(null);}; image.src=photo.file;
    }));
    return [photo.id,await cache.get(photo.file)!] as const;
  }));
  return new Map(rows.filter((row):row is readonly [string,HTMLImageElement]=>row[1]!==null));
}
function lines(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,size=24){
  ctx.font=`${size}px Arial`; let line='',row=0;
  for(const word of text.split(/\s+/)){if(ctx.measureText(`${line} ${word}`).width>width&&line){ctx.fillText(line,x,y+row++*size*1.4);line=word;}else line=line?`${line} ${word}`:word;}
  ctx.fillText(line,x,y+row*size*1.4);return y+(row+1)*size*1.4;
}
const procedureCanvases=new WeakMap<HTMLCanvasElement,HTMLCanvasElement>();
/** Procedure animation and English subtitles, without a photo reference strip. */
export function drawPhotographicExperiment(canvas:HTMLCanvasElement,activity:ExperimentActivity,scene:number,phase:number,_images:PhotoImages,presentation?:ExperimentScene){
  let procedure=procedureCanvases.get(canvas);
  if(!procedure){procedure=document.createElement('canvas');procedureCanvases.set(canvas,procedure);}
  drawExperiment(procedure,activity,scene,phase,1.5);
  // Keep the backing buffer stable between frames; resizing clears canvas state.
  if(canvas.width!==1920)canvas.width=1920;if(canvas.height!==1080)canvas.height=1080;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.fillStyle='#eff6fb';ctx.fillRect(0,0,1920,1080);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  // Preserve the labelled apparatus and side explanation; replace the repeated
  // lower note block with complete, timed captions in a 16:9 Full HD frame.
  ctx.drawImage(procedure,0,0,1920,885,0,0,1920,885);
  if(presentation){ctx.fillStyle='#102b43';ctx.fillRect(0,90,1920,65);ctx.fillStyle='#aee0ea';ctx.font='26px Arial';ctx.fillText(presentation.kind==='step'?`PROCEDURE · STEP ${scene+1} / ${activity.steps.length}`:presentation.title.toUpperCase(),52,125);}
  // Burn English subtitles into the saved video as well as on-screen playback.
  const text=presentation?.text||activity.steps[scene]?.description||`${activity.observation} ${activity.conclusion}`;
  const duration=presentation?.duration||Math.max(6,text.split(/\s+/).length/2.2+2);
  const subtitle=experimentCaptionAt(text,phase,duration);
  ctx.fillStyle='#102b43';ctx.fillRect(0,885,1920,195);
  ctx.fillStyle='#aee0ea';ctx.font='bold 23px Arial';
  ctx.fillText(presentation?.title||(scene>=activity.steps.length?'Observe and explain':`Step ${scene+1}`),42,924);
  ctx.fillStyle='#fff';lines(ctx,subtitle,42,971,1836,32);
  ctx.fillStyle='#2a5166';ctx.fillRect(42,1051,1836,7);ctx.fillStyle='#56d4c6';ctx.fillRect(42,1051,1836*Math.max(0,Math.min(1,phase/duration)),7);
}
