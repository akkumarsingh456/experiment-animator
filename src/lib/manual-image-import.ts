export function canImportMedEasy(klass:string,subject:string){
  const grade=klass.match(/(?:^|\D)(9|10|11|12)(?=\D|$)/)?.[1];
  return (grade==='11'||grade==='12')&&/^(physics|chemistry)$/i.test(subject.trim());
}
export function topicDiagramQuery(klass:string,subject:string,chapter:string,topic:string){
  const clean=(text:string)=>text.replace(/^chapter\s*\d+\s*[:.\-]?\s*/i,'').replace(/\b(?:teacher notes|key points|classroom discussion|learning and practice)\b/gi,'').trim();
  return (clean(topic)||clean(chapter)||`${subject} Class ${klass}`).slice(0,220);
}
export function googleDiagramUrl(query:string){
  const params=new URLSearchParams({q:`${query} labelled diagram -advertisement -wallpaper -shopping`,udm:'2',safe:'active',tbs:'itp:lineart'});
  return `https://www.google.com/search?${params}`;
}
export type ImageCredit={title:string;page:string;author:string;license:string;licenseUrl:string};
export function imageWithCredit(image:CanvasImageSource,width:number,height:number,credit?:ImageCredit){
  const canvas=document.createElement('canvas'),footer=credit?Math.max(42,Math.round(width*.045)):0;
  canvas.width=width;canvas.height=height+footer;const context=canvas.getContext('2d')!;context.drawImage(image,0,0,width,height);
  if(credit){context.fillStyle='white';context.fillRect(0,height,width,footer);context.fillStyle='#334155';context.font=`${Math.max(9,Math.round(width*.012))}px sans-serif`;
    const fit=(text:string)=>{let result=text;while(result.length&&context.measureText(result).width>width-16)result=result.slice(0,-1);return result.length<text.length?`${result.slice(0,-1)}…`:result;};
    context.fillText(fit(`${credit.author} · ${credit.license}`),8,height+footer*.4);context.fillText(fit(credit.page.replace('https://','')),8,height+footer*.78);
  }return canvas.toDataURL('image/png');
}

/** Browser image drags often contain an HTML/URL item rather than a File. */
export function transferredImageUrls(transfer:DataTransfer):string[]{
  const urls:string[]=[];
  const add=(value:string)=>{if(/^data:image\/(?:png|jpeg|webp);base64,/i.test(value)&&value.length<16*1024*1024){urls.push(value);return;}try{const url=new URL(value);const original=url.searchParams.get('imgurl')||url.searchParams.get('mediaurl');
    if(original)add(original);if(url.protocol==='https:'&&!url.username&&!url.password&&!/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[|0\.)/i.test(url.hostname))urls.push(url.href);
  }catch{/* Plain text is not necessarily an image address. */}};
  const html=transfer.getData('text/html');if(html){const doc=new DOMParser().parseFromString(html,'text/html');doc.querySelectorAll('img').forEach(img=>add(img.getAttribute('src')||''));doc.querySelectorAll('a').forEach(a=>add(a.getAttribute('href')||''));}
  for(const line of (transfer.getData('text/uri-list')||transfer.getData('text/plain')).split('\n'))if(!line.startsWith('#'))add(line.trim());
  return [...new Set(urls)].slice(0,4);
}
