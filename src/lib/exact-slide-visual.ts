/** Stable identity for the actual displayed page, not its topic's parent slide.
 * Different continuation content must never inherit another page's image. */
export function exactSlideVisualId(slide:{sections?:Array<{heading:string;kind:string;lines:string[]}>;bullets?:string[];notes?:string[]},topicSlot='topic-slide:0'){
 const content=JSON.stringify(slide.sections?.length?slide.sections.map(section=>[section.heading,section.kind,section.lines]):[slide.bullets||[],slide.notes||[]]);
 let a=2166136261,b=5381;
 for(let i=0;i<content.length;i++){a=Math.imul(a^content.charCodeAt(i),16777619);b=Math.imul(b,33)^content.charCodeAt(i);}
 return `page:${topicSlot}:${(a>>>0).toString(16)}${(b>>>0).toString(16)}`;
}
