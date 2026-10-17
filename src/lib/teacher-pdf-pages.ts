import type {GenerationResult} from '@/lib/generate.functions';
import {signDownload} from '@/lib/ingest.functions';
import {loadPdfjs} from '@/lib/pdf-extract';

/** Render original teacher pages before presenting or exporting; never require upload privileges. */
export async function prepareTeacherPdfPages(result:GenerationResult):Promise<GenerationResult>{
 const slides=result.slides.map(slide=>({...slide}));
 const paths=[...new Set(slides.flatMap(slide=>slide.teacher_pdf?[slide.teacher_pdf.path]:[]))];
 if(!paths.length)return result;
 const library=await loadPdfjs();
 for(const path of paths){
  const {signedUrl}=await signDownload({data:{path}});
  const task=library.getDocument({url:signedUrl});
  const pdf=await task.promise;
  try{
   for(const slide of slides){
    const source=slide.teacher_pdf;if(!source||source.path!==path)continue;
    const page=await pdf.getPage(source.page),viewport=page.getViewport({scale:1.5});
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    const context=canvas.getContext('2d');if(!context)throw new Error('The original teacher PDF could not be displayed. Please retry.');
    await page.render({canvas,canvasContext:context,viewport}).promise;
    slide.reference_visuals=[{title:source.file_name,description:`Original uploaded teacher notes · PDF page ${source.page}`,page:source.page,book:source.file_name,storage_path:`${path}#page=${source.page}`,url:canvas.toDataURL('image/jpeg',0.9),aspect:viewport.width/viewport.height,crop:{x:0,y:0,width:1,height:1},kind:'diagram',capture:'page'}];
    canvas.width=canvas.height=0;page.cleanup();
   }
  }finally{await task.destroy();}
 }
 return {...result,slides};
}
