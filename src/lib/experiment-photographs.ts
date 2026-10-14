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
export function drawPhotographicExperiment(canvas:HTMLCanvasElement,activity:ExperimentActivity,scene:number,phase:number,images:PhotoImages){
  const photos=apparatusPhotos(activity).filter(photo=>images.has(photo.id));
  if(!photos.length){drawExperiment(canvas,activity,scene,phase);return;}
  canvas.width=1280;canvas.height=800;const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.fillStyle='#f5f7fa';ctx.fillRect(0,0,1280,800);ctx.fillStyle='#132e42';ctx.fillRect(0,0,1280,116);
  ctx.fillStyle='#fff';lines(ctx,activity.name,28,38,1220,25);
  ctx.fillStyle='#bde8ed';ctx.font='16px Arial';ctx.fillText(`REAL APPARATUS PHOTOGRAPHS  •  ${scene<activity.steps.length?`STEP ${scene+1} / ${activity.steps.length}`:'OBSERVE & EXPLAIN'}`,28,96);
  const step=activity.steps[scene];const description=step?.description||`${activity.observation} ${activity.conclusion}`;
  const relevant=photos.filter(photo=>matches[photo.id].test(description)||(/read|measure|range|least count/i.test(description)&&['ammeter','voltmeter'].includes(photo.id)));
  const chosen=scene===0?photos.slice(0,4):relevant.length?relevant.slice(0,4):[photos[scene%photos.length]];
  chosen.forEach((photo,index)=>{
    const cols=chosen.length===1?1:2,rows=Math.ceil(chosen.length/cols),w=760/cols,h=450/rows,x=24+(index%cols)*w,y=140+Math.floor(index/cols)*h;
    ctx.fillStyle='#fff';ctx.fillRect(x+4,y+4,w-12,h-12);
    const image=images.get(photo.id)!;const scale=Math.min((w-42)/image.width,(h-64)/image.height);const iw=image.width*scale,ih=image.height*scale;
    ctx.drawImage(image,x+(w-iw)/2,y+18+(h-64-ih)/2,iw,ih);
    ctx.strokeStyle=`rgba(0,117,137,${.55+.35*Math.sin(phase)**2})`;ctx.lineWidth=3;ctx.strokeRect(x+4,y+4,w-12,h-12);
    ctx.fillStyle='#12384b';lines(ctx,photo.label,x+17,y+h-28,w-32,17);
  });
  ctx.fillStyle='#12384b';ctx.font='bold 25px Arial';ctx.fillText(step?.title||'Observe & explain',815,166);
  const words=description.split(/\s+/).length;
  lines(ctx,description,815,208,430,words>100?16:words>70?18:21);
  ctx.fillStyle='#e1edf1';ctx.fillRect(24,612,1232,76);ctx.fillStyle='#264759';
  lines(ctx,'Equipment identification photos; these are not a photograph of the complete connected setup or measured results. Watch the recorded demonstration below for the actual procedure.',42,638,1190,18);
  ctx.fillStyle='#526473';lines(ctx,chosen.map(photo=>`${photo.author} (${photo.license})`).join(' • '),28,721,1220,13);
  ctx.fillText('Photo source links and licences are listed below the player. Guided photo animation; no AI-generated imagery.',28,780);
}
