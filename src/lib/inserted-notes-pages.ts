import type {Slide} from './generate.functions';
import type {LayoutPage} from './slide-layout-check';
import {AI_TOPIC_HEADING} from './missing-topic-import';
import {paginateLectureSections,DEFAULT_LECTURE_ROWS} from './lecture-pages';

/** Keep placed notes out of original-page measurement and pagination. */
export function withoutPlacedNotes(slide:Slide):Slide{
 const groups=slide.teacher_supplement?.placements;if(!groups?.length)return slide;
 const placed=new Set(groups.flatMap(group=>group.lines));
 return {...slide,sections:slide.sections?.map(section=>section.heading===AI_TOPIC_HEADING?{...section,lines:section.lines.filter(line=>!placed.has(line))}:section).filter(section=>section.lines.length)};
}
export type NotesPage=LayoutPage&{notePageId:string};
/** Insert new, separately paginated pages after the clicked page. Original
 * pages are never merged or repaginated with the inserted points. */
export function insertNotesPages(base:LayoutPage[],slides:Slide[]):NotesPage[]{
 const counts=new Map<number,number>();
 const originals=base.map(page=>{const ordinal=counts.get(page.sourceIndex)||0;counts.set(page.sourceIndex,ordinal+1);return {...page,notePageId:`original:${ordinal}`};});
 const result:NotesPage[]=[];
 const seen=new Set<string>();
 function children(page:NotesPage){
  const slide=slides[page.sourceIndex];
  for(const group of slide?.teacher_supplement?.placements||[]){
   const key=`${page.sourceIndex}:${group.id}`;
   if(group.afterPageId!==page.notePageId||seen.has(key))continue;
   seen.add(key);
   const lines=group.lines.filter(line=>slide.teacher_supplement!.lines.includes(line));
   if(!lines.length)continue;
   const pages=paginateLectureSections([{heading:AI_TOPIC_HEADING,kind:'bullets',lines}],DEFAULT_LECTURE_ROWS);
   pages.forEach((sections,index)=>{
    const added:NotesPage={title:page.title,kind:'content',visual:'book',bullets:[],notes:[],key_terms:[],sections:sections as Slide['sections'],caption:'Added teacher notes',sourceIndex:page.sourceIndex,notePageId:`added:${group.id}:${index}`};
    result.push(added);children(added);
   });
  }
 }
 originals.forEach(page=>{result.push(page);children(page);});
 // A deleted parent may leave child notes. Keep them after the same topic,
 // never move them into an earlier topic or silently lose them.
 for(const [sourceIndex,slide] of slides.entries()){
  const orphaned=(slide.teacher_supplement?.placements||[]).filter(group=>group.lines.length&&!seen.has(`${sourceIndex}:${group.id}`));
  for(const group of orphaned){
   let at=result.length-1;while(at>=0&&result[at].sourceIndex!==sourceIndex)at--;if(at<0)continue;
   const prior=result.splice(at+1);children({...result[at],notePageId:group.afterPageId});result.push(...prior);
  }
 }
 return result;
}
