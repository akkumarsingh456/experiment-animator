import {captureBlankSlides,readBlankSlides,restoreBlankSlides,type SavedBlankPosition} from './saved-blank-slides';
import {loadManualVisuals,manualVisualCache,saveManualVisual} from './manual-visuals';
import {imageBelongsToWorkspace,workspaceDeviceKey,workspaceLesson,workspaceSnapshotSchema,type WorkspaceScope,type WorkspaceSnapshot} from './teacher-workspace';
import type {GenerationResult,Slide} from './generate.functions';
import {teachingBookmarkSchema,type TeachingBookmark} from './teaching-bookmark';

export async function captureWorkspace(scope:WorkspaceScope,result:GenerationResult,slides:Slide[],deleted:SavedBlankPosition|null,bookmark:TeachingBookmark|null){
  await loadManualVisuals();
  const titles=new Set(slides.map(slide=>slide.title));
  return workspaceSnapshotSchema.parse({version:1,scope,lesson:{...result,slides:slides.slice(1)},blanks:captureBlankSlides(slides,deleted),bookmark,images:[...manualVisualCache].filter(([key])=>imageBelongsToWorkspace(key,scope,titles)).map(([key,visual])=>({key,visual}))});
}
/** Restore a deliberate private backup without replacing existing device images
 * or locally edited blank slides. Never publish restored data for everyone. */
export async function restoreWorkspace(snapshot:WorkspaceSnapshot){
  const key=workspaceDeviceKey(snapshot.scope),warnings:string[]=[];
  let blanks=snapshot.blanks;
  try{
    const local=readBlankSlides(key),merged=new Map(blanks.blanks.map(item=>[item.slide.teacher_blank.id,item]));
    for(const item of local.blanks)merged.set(item.slide.teacher_blank.id,item);
    if(local.deleted)merged.delete(local.deleted.slide.teacher_blank.id);
    blanks={version:1,blanks:[...merged.values()].sort((a,b)=>a.index-b.index),deleted:local.deleted||blanks.deleted};
    localStorage.setItem(key,JSON.stringify(blanks));
  }catch{warnings.push('Some slide additions could not be saved on this device. Keep the cloud backup.');}
  try{
    const bookmarkKey='eduplan-teaching-bookmark-v1:'+key;
    if(snapshot.bookmark&&!localStorage.getItem(bookmarkKey))localStorage.setItem(bookmarkKey,JSON.stringify(teachingBookmarkSchema.parse(snapshot.bookmark)));
  }catch{warnings.push('The teaching bookmark could not be restored on this device.');}
  try{
    await loadManualVisuals();const titles=new Set(snapshot.lesson.slides.map(slide=>slide.title));
    for(const item of snapshot.images)if(!manualVisualCache.has(item.key)&&imageBelongsToWorkspace(item.key,snapshot.scope,titles))await saveManualVisual(item.key,item.visual);
  }catch{warnings.push('Some private images could not be restored on this device. The cloud backup remains available.');}
  const lesson=workspaceLesson(snapshot);
  return {lesson:{...lesson,slides:restoreBlankSlides(lesson.slides.filter(slide=>!slide.teacher_blank),blanks)},warnings};
}
