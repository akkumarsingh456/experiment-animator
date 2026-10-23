import type {jsPDF} from 'jspdf';

/** Capture sections separately to bound memory, but pack them into the same PDF page. */
export async function appendContinuousNotes(pdf:jsPDF,articles:HTMLElement[],capture:(article:HTMLElement)=>Promise<HTMLCanvasElement>,onProgress?:(done:number,total:number)=>void){
 const margin=12,width=pdf.internal.pageSize.getWidth()-margin*2,height=pdf.internal.pageSize.getHeight();
 const bottom=height-margin-7,fullHeight=bottom-margin;
 let cursor=margin,pageNumber=0;
 const newPage=()=>{
  if(pageNumber)pdf.addPage();pageNumber++;cursor=margin;
  pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(90);
  pdf.text(`Guided notes · ${pageNumber}`,margin,height-9);
 };
 newPage();onProgress?.(0,articles.length);
 for(let articleIndex=0;articleIndex<articles.length;articleIndex++){
  const article=articles[articleIndex];
  // The optional Next Class Plan keeps its promised final-page placement.
  if(article.matches('.next-class-plan-page')&&cursor>margin+.5)newPage();
  const canvas=await capture(article),rect=article.getBoundingClientRect();
  if(!canvas.width||!canvas.height||!rect.width)throw new Error('A notes section could not be rendered. Retry the download.');
  const pxScale=canvas.width/rect.width,mmPerPixel=width/canvas.width,maxPixels=fullHeight/mmPerPixel;
  const ranges:Array<[number,number]>=[],breaks=new Set<number>([0,canvas.height]);
  const protect=(top:number,end:number)=>{
   if(end<=top)return;breaks.add(Math.max(0,top));breaks.add(Math.min(canvas.height,end));
   if(end-top<maxPixels*.92)ranges.push([top,end]);
  };
  const nodeRange=(node:Element)=>{const r=node.getBoundingClientRect();return [(r.top-rect.top)*pxScale,(r.bottom-rect.top)*pxScale] as [number,number];};
  article.querySelectorAll<HTMLElement>('p,li,tr,h2,h3,h4,h5,summary,.katex-display,.teacher-guide-passage,.mathematics-guide-line').forEach(node=>{
   if(!node.getClientRects().length)return;
   const [top,end]=nodeRange(node);
   // Large containers are split only at their own text-line boundaries.
   if(end-top>maxPixels*.8||node.matches('li')&&node.querySelector('p,li')){
    breaks.add(top);breaks.add(end);
   }else protect(top,end);
  });
  const walker=article.ownerDocument.createTreeWalker(article,NodeFilter.SHOW_TEXT);
  let textNode:Node|null;
  while((textNode=walker.nextNode())){
   if(!textNode.textContent?.trim())continue;
   const range=article.ownerDocument.createRange();range.selectNodeContents(textNode);
   for(const r of Array.from(range.getClientRects()))if(r.height>0)protect((r.top-rect.top)*pxScale,(r.bottom-rect.top)*pxScale);
   range.detach();
  }
  // Keep headings with the beginning of the following explanation, not an
  // entire long list. This prevents orphan titles without forcing big gaps.
  article.querySelectorAll<HTMLElement>('h2,h3,h4,h5,summary').forEach(heading=>{
   let next=heading.nextElementSibling as HTMLElement|null;
   while(next&&!next.getClientRects().length)next=next.nextElementSibling as HTMLElement|null;
   if(!next)return;
   const [top,end]=nodeRange(heading),[nextTop,nextEnd]=nodeRange(next);
   protect(top,Math.min(nextEnd,Math.max(end,nextTop+28*pxScale)));
  });
  const boundaries=[...breaks].filter(value=>Number.isFinite(value)&&value>=0&&value<=canvas.height).sort((a,b)=>a-b);
  const links=Array.from(article.querySelectorAll<HTMLAnchorElement>('a[href]')).map(link=>({url:link.href,rect:link.getBoundingClientRect()}));
  let start=0;
  while(start<canvas.height-.5){
   if(bottom-cursor<8)newPage();
   const limit=Math.min(canvas.height,start+(bottom-cursor)/mmPerPixel);
   let end=limit;
   if(limit<canvas.height){
    const candidates=boundaries.filter(value=>value>start+.5&&value<=limit+.01&&!ranges.some(([top,bottom])=>top<value-.5&&bottom>value+.5));
    end=candidates.at(-1)??start;
    if(end<=start+.5){
     if(cursor>margin+.5){newPage();continue;}
     // Only an object taller than a page can reach this fallback. Text lines
     // and ordinary displayed equations already have protected cut positions.
     end=limit;
    }
   }
   const crop=article.ownerDocument.createElement('canvas');crop.width=canvas.width;crop.height=Math.max(1,Math.ceil(end-start));
   const context=crop.getContext('2d');if(!context)throw new Error('PDF rendering is unavailable.');
   context.fillStyle='#fff';context.fillRect(0,0,crop.width,crop.height);
   context.drawImage(canvas,0,start,canvas.width,end-start,0,0,crop.width,end-start);
   pdf.addImage(crop.toDataURL('image/jpeg',.92),'JPEG',margin,cursor,width,(end-start)*mmPerPixel,undefined,'FAST');
   for(const link of links){
    const top=(link.rect.top-rect.top)*pxScale,endLink=(link.rect.bottom-rect.top)*pxScale;
    if(top>=start-.5&&endLink<=end+.5)pdf.link(margin+(link.rect.left-rect.left)*pxScale*mmPerPixel,cursor+(top-start)*mmPerPixel,link.rect.width*pxScale*mmPerPixel,link.rect.height*pxScale*mmPerPixel,{url:link.url});
   }
   cursor+=(end-start)*mmPerPixel;start=end;crop.width=crop.height=0;
   if(start<canvas.height-.5)newPage();
   await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
  canvas.width=canvas.height=0;
  onProgress?.(articleIndex+1,articles.length);
 }
}
