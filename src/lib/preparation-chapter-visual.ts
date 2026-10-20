import { topicScienceDrawing } from './topic-science-visuals';
import { geometryDiagram } from './geometry-diagrams';
import { subtopicsFor } from './ncert-syllabus';

const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));
/** Loading-screen artwork only. A roadmap shows syllabus membership, never
 * fabricated evidence, an experiment or a claim of generation progress. */
export function preparationChapterVisual(klass:string,subject:string,chapter:string){
 const title=chapter.replace(/^Chapter\s+\d+\s*:\s*/i,'').replace(/\s*\((Physics|Chemistry|Biology)\)\s*$/i,'');
 const discipline=/^Science$/i.test(subject)?chapter.match(/\((Physics|Chemistry|Biology)\)/i)?.[1]||subject:subject;
 const geometry=geometryDiagram(title,discipline);
 if(geometry)return {...geometry,kind:'diagram' as const};
 const drawing=/^(Physics|Chemistry|Biology|Science|Botany|Zoology)$/i.test(discipline)?topicScienceDrawing({title,chapter},discipline):null;
 if(drawing)return {kind:'diagram' as const,caption:drawing.caption,svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 550"><defs><marker id="tip" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0L0 6L9 3Z" fill="#173d50"/></marker></defs>${drawing.drawing}</svg>`};
 const topics=subtopicsFor(klass.replace(/^Class\s*/i,''),subject,chapter).slice(0,3);
 const labels=topics.length?topics:/English|Hindi|Sanskrit/i.test(subject)?['Read the text','Explore language and meaning','Discuss using evidence']:['Explore the chapter','Connect the concepts','Practise and reflect'];
 const rows=labels.map((label,index)=>{
  const words=label.split(/\s+/),lines:string[]=[''];
  for(const word of words){if((lines.at(-1)!.length+word.length)>43)lines.push('');lines[lines.length-1]+=(lines.at(-1)?' ':'')+word;}
  return `<path d="M105 105V${190+index*95}H140" fill="none" stroke="#6697aa" stroke-width="3"/><rect x="140" y="${155+index*95}" width="515" height="76" rx="12" fill="#edf6fa" stroke="#83a8b8"/><circle cx="168" cy="${190+index*95}" r="16" fill="#21647e"/><text x="168" y="${197+index*95}" text-anchor="middle" font-family="sans-serif" font-size="19" fill="white">${index+1}</text>${lines.slice(0,2).map((line,i)=>`<text x="200" y="${184+index*95+i*25}" font-family="sans-serif" font-size="20" fill="#173d50">${escape(line)}</text>`).join('')}`;
 }).join('');
 return {kind:'roadmap' as const,caption:'Chapter roadmap · syllabus topics, not a scientific diagram.',svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 500"><rect x="65" y="35" width="630" height="85" rx="16" fill="#21647e"/><text x="95" y="72" font-family="sans-serif" font-size="18" fill="white">${escape(subject)} · ${escape(klass?`Class ${klass.replace(/^Class\s*/i,'')}`:'Chapter study')}</text><text x="95" y="102" font-family="sans-serif" font-size="22" fill="white">Chapter learning map</text>${rows}</svg>`};
}
