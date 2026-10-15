import assets from './experiment-photo-assets.json';
import type { ExperimentActivity } from './experiment-activities';
import { drawExperiment } from './experiment-drawing';

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
export function drawPhotographicExperiment(canvas:HTMLCanvasElement,activity:ExperimentActivity,scene:number,phase:number,_images:PhotoImages){
  let procedure=procedureCanvases.get(canvas);
  if(!procedure){procedure=document.createElement('canvas');procedureCanvases.set(canvas,procedure);}
  drawExperiment(procedure,activity,scene,phase);
  canvas.width=1280;canvas.height=780;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.drawImage(procedure,0,0);
  // Burn English subtitles into the saved video as well as on-screen playback.
  const text=activity.steps[scene]?.description||`${activity.observation} ${activity.conclusion}`;
  const chunks=text.match(/.{1,135}(?:\s|$)|\S{1,135}/g)||[text];
  const subtitle=chunks[Math.min(chunks.length-1,Math.floor(phase/5))].trim();
  ctx.fillStyle='#102b43';ctx.fillRect(0,720,1280,60);ctx.fillStyle='#fff';
  lines(ctx,`English subtitles · ${subtitle}`,25,744,1230,18);
}
