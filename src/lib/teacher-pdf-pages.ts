import type {GenerationResult,Slide} from '@/lib/generate.functions';
import {signDownload} from '@/lib/ingest.functions';
import {loadPdfjs} from '@/lib/pdf-extract';
import {getLibraryAccess} from '@/lib/library-access.functions';
import {readScannedPage} from '@/lib/reference-ocr.functions';
import {splitReferenceContent} from '@/lib/reference-visuals';
import {toast} from 'sonner';

/** Render original teacher pages before presenting or exporting; never require upload privileges. */
export async function prepareTeacherPdfPages(result:GenerationResult):Promise<GenerationResult>{
 const slides=result.slides.map(slide=>({...slide}));
 const paths=[...new Set(slides.flatMap(slide=>slide.teacher_pdf?[slide.teacher_pdf.path]:[]))];
 if(!paths.length)return result;
 const canRead=(await getLibraryAccess().catch(()=>null))?.admin===true;
 const transcribed:Slide[]=[];
 let unread=0;
 const library=await loadPdfjs();
 for(const path of paths){
  const {signedUrl}=await signDownload({data:{path}});
  const task=library.getDocument({url:signedUrl});
  const pdf=await task.promise;
  try{
   for(const slide of slides){
    const source=slide.teacher_pdf;if(!source||source.path!==path)continue;
    const page=await pdf.getPage(source.page),base=page.getViewport({scale:1});
    const viewport=page.getViewport({scale:Math.min(1.5,1800/Math.max(base.width,base.height))});
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    const context=canvas.getContext('2d');if(!context)throw new Error('The original teacher PDF could not be displayed. Please retry.');
    await page.render({canvas,canvasContext:context,viewport}).promise;
    slide.reference_visuals=[{title:source.file_name,description:`Original uploaded teacher notes · PDF page ${source.page}`,page:source.page,book:source.file_name,storage_path:`${path}#page=${source.page}`,url:canvas.toDataURL('image/jpeg',0.9),aspect:viewport.width/viewport.height,crop:{x:0,y:0,width:1,height:1},kind:'diagram',capture:'page'}];
    const bookId=slide.teacher_revision?.book_id;
    const hasText=slides.some(item=>!item.teacher_pdf&&item.teacher_revision?.book_id===bookId&&item.teacher_revision?.page===source.page&&item.sections?.some(section=>/Teacher (?:Notes|revision notes)/i.test(section.heading)&&section.lines.join(' ').length>150));
    if(!hasText&&bookId){
     if(canRead){
      try{
       const content=await readScannedPage({data:{image:canvas.toDataURL('image/jpeg',.9),book_id:bookId,page:source.page,aspect:viewport.width/viewport.height,chapter_hint:slide.title.replace(/\s*—.*$/,''),source_file_name:source.file_name,text_only:true}});
       const text=splitReferenceContent(content).text;
       const lines=text.split(/\n\s*\n|\r?\n/).map(line=>line.trim()).filter(Boolean);
       if(lines.length)transcribed.push({...slide,title:slide.title.replace(/original teacher PDF/,'Teacher Notes'),teacher_pdf:undefined,reference_visuals:[],sections:[{heading:'Teacher Notes',kind:'text',lines}],grounding:text,caption:`Transcribed uploaded teacher notes · ${source.file_name} · PDF page ${source.page}`});
      }catch{unread++;}
     }else unread++;
    }
    canvas.width=canvas.height=0;page.cleanup();
   }
  }finally{await task.destroy();}
 }
 if(unread)toast.warning(`${unread} teacher PDF page(s) still need text reading. The library administrator can regenerate to read them; original pages are retained.`);
 const originals=slides.filter(slide=>slide.teacher_pdf);
 const core=slides.filter(slide=>!slide.teacher_pdf);
 const assessment=core.findIndex(slide=>slide.kind==='mcq');
 const at=assessment<0?core.length:assessment;
 return {...result,slides:[...core.slice(0,at),...transcribed,...originals,...core.slice(at)]};
}
