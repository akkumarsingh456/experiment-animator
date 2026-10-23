import {isOfficialPyqReading} from './cbse-pyq';
import {presentPyq} from './pyq-presentation';
import {pyqPdfHref,questionTeachingPoints,type PyqQuestion,type PyqReading} from './cbse-pyq-questions';
import {exportFontCss} from './export-fonts';
import {worksheetSlices} from './lesson-pdf';

/** Separate teacher-initiated export; never adds PYQs to lecture export roots. */
export async function downloadPyqPdf(rows:{question:PyqQuestion;reading:PyqReading}[],title:string,onProgress:(done:number,total:number)=>void){
 if(!rows.length)throw new Error('No extracted questions match this selection.');
 if(rows.some(row=>!isOfficialPyqReading(row.reading)))throw new Error('Only questions linked to the official CBSE catalogue can be downloaded here.');
 const [{jsPDF},{toCanvas}]=await Promise.all([import('jspdf'),import('html-to-image')]);
 const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});
 const root=document.createElement('div');
 // Render one question at a time to bound memory. Unicode, formula glyphs and
 // code indentation are rendered by the browser instead of a limited PDF font.
 root.style.cssText='position:fixed;left:-10000px;top:0;width:740px;padding:24px;box-sizing:border-box;background:white;color:#172b3a;font:16px/1.8 Arial,sans-serif;overflow-wrap:anywhere';
 root.setAttribute('aria-hidden','true');document.body.append(root);
 let pageCount=0;
 const append=(tag:string,text:string,style='')=>{const node=document.createElement(tag);node.textContent=text;node.style.cssText=style;root.append(node);return node;};
 try{
  await document.fonts.ready;const fontEmbedCSS=await exportFontCss(root);
  for(const [index,{reading,question}] of rows.entries()){
   onProgress(index,rows.length);root.replaceChildren();
   append('h1',title,'font-size:21px;line-height:1.4;margin:0 0 10px');
   append('h2',`${reading.year} · ${reading.exam} · Question ${question.number}`,'font-size:18px;margin:0 0 6px;color:#075985');
   append('p',`Class ${reading.klass} · ${reading.subject} · ${question.chapter||'Chapter needs review'}`,'margin:0 0 10px;font-size:13px');
   const view=presentPyq(question.text,reading.subject);
   for(const line of (view.text||'Readable English text is not available for this question. Check the English version in the original CBSE PDF.').split('\n'))append('p',line||'\u00a0',`margin:0;white-space:pre-wrap;${view.code?'font-family:monospace;font-size:14px;tab-size:4;':''}${/^\s*OR\s*$/i.test(line)?'margin:12px 0;font-weight:bold;color:#075985;':''}`);
   if(view.warnings.length)append('p',`Source review needed: ${view.warnings.join(' ')}`,'margin:16px 0 8px;padding:10px;background:#fff7df;font-size:12px');
   if(reading.questions.length&&question.ocr)append('p','OCR transcription: verify wording, options and symbols against the original PDF.','font-size:12px;margin:10px 0');
   const preparation=questionTeachingPoints(question);
   if(preparation.length){append('h3','Topics and practice to prepare','font-size:15px;margin:16px 0 4px;color:#075985');for(const point of preparation)append('p',`• ${point}`,'font-size:13px;margin:3px 0');append('p','Suggested teaching preparation, not a CBSE answer or marking scheme.','font-size:11px;margin:8px 0');}
   append('p','Transcription of a CBSE paper, not an official answer key. Verify notation, diagrams and incomplete text against the source PDF.','font-size:11px;margin:12px 0');
   append('p',`${reading.file} · PDF pages ${question.page}–${question.endPage}`,'font-size:11px;margin:0');
   const link=append('a','Open original CBSE source PDF','font-size:12px;color:#0369a1;text-decoration:underline') as HTMLAnchorElement;
   link.href=new URL(pyqPdfHref(reading.url,reading.file,question.page),location.origin).href;
   const canvas=await toCanvas(root,{pixelRatio:1.5,backgroundColor:'#ffffff',fontEmbedCSS,style:{position:'static',left:'0',top:'0'}});
   try{
    const rect=root.getBoundingClientRect(),scale=canvas.width/rect.width,pageHeight=267/186*canvas.width;
    const ranges:Array<[number,number]>=[];
    for(const element of root.children){const range=document.createRange();range.selectNodeContents(element);for(const line of Array.from(range.getClientRects()))ranges.push([(line.top-rect.top)*scale,(line.bottom-rect.top)*scale]);}
    const slices=worksheetSlices(canvas.height,pageHeight,ranges.flat(),ranges);
    for(const [start,end] of slices){
     if(pageCount++)pdf.addPage();
     const crop=document.createElement('canvas');crop.width=canvas.width;crop.height=Math.ceil(end-start);
     try{const context=crop.getContext('2d');if(!context)throw new Error('PDF rendering is unavailable.');context.fillStyle='white';context.fillRect(0,0,crop.width,crop.height);context.drawImage(canvas,0,start,canvas.width,end-start,0,0,crop.width,end-start);
      const factor=186/canvas.width;pdf.addImage(crop.toDataURL('image/jpeg',.95),'JPEG',12,12,186,crop.height*factor,undefined,'FAST');
      const r=link.getBoundingClientRect(),top=(r.top-rect.top)*scale,bottom=(r.bottom-rect.top)*scale;
      if(top>=start&&bottom<=end)pdf.link(12+(r.left-rect.left)*scale*factor,12+(top-start)*factor,r.width*scale*factor,r.height*scale*factor,{url:link.href});
      pdf.setFontSize(9);pdf.setTextColor(70);pdf.text(`CBSE PYQs | Page ${pageCount}`,12,288);
     }finally{crop.width=crop.height=0;}
    }
   }finally{canvas.width=canvas.height=0;}
   onProgress(index+1,rows.length);await new Promise(resolve=>setTimeout(resolve,0));
  }
  pdf.save(`${title.replace(/[<>:"/\\|?*]/g,'-').slice(0,160)||'CBSE-PYQs'}.pdf`);
 }finally{root.remove();}
}
