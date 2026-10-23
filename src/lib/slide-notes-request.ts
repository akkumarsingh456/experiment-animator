import type {Slide} from './generate.functions';

export type SlideNoteFormat='activity'|'important'|'formula'|'derivation'|'example'|'revision'|'explanation';
export function slideNotesRequest(slide:Slide,scope:{klass:string;subject:string;chapter:string},pageHeadings?:string[]){
 const syntheticActivity=(slide.sections||[]).some(section=>/activity|source analysis/i.test(section.heading)&&section.lines.some(line=>/teacher.designed|paper.and.pencil source analysis/i.test(line)));
 const headings=(pageHeadings?.length?pageHeadings:(slide.sections||[]).map(section=>section.heading)).filter(heading=>!/^Source (review|table)|supplementary teacher/i.test(heading)&&!/source analysis/i.test(heading)&&!(syntheticActivity&&/^activit(?:y|ies)$/i.test(heading.trim()))).join(' | ');
 const activity=/activity|experiment|investigat|source analysis/i;
 const format:SlideNoteFormat=activity.test(headings)?'activity':/worked example|solution|solved example/i.test(headings)?'example':/derivation|proof/i.test(headings)?'derivation':/formula|equation|relation/i.test(headings)?'formula':/important|key point/i.test(headings)?'important':/revision|recap|summary/i.test(headings)?'revision':'explanation';
 const instructions:Record<SlideNoteFormat,string>={
  activity:'Prepare an activity-based explanation. Include the aim, any source-stated materials, numbered steps, source-supported observations and the conclusion. Separate a teacher-designed source-analysis task from a textbook experiment. Do not invent measurements, experimental results or unsafe procedures.',
  important:'Write clear, distinct important points. Explain key terms and relationships, include the stated conditions and exceptions, and avoid repeating the same point.',
  formula:'Explain each relevant source formula, define its symbols, give the applicable conditions and units where relevant, and explain how it is used. Include a worked application only when fully supported by the source.',
  derivation:'Present the source derivation or proof in order: starting facts, assumptions, numbered steps with reasons, and final result. Retain every stated condition; do not fill in damaged notation by guessing.',
  example:'Explain a complete source example step by step: given information, what to find, method and why it applies, working, answer and interpretation. Do not invent missing values or answers.',
  revision:'Prepare concise revision points covering the central idea, key distinctions, applicable relations and stated conditions. Keep every point understandable on its own.',
  explanation:'Explain the topic in clear teaching points, starting with its meaning, followed by how it works, key distinctions and a source-supported example where available.',
 };
 const label:Record<SlideNoteFormat,string>={activity:'Activities',important:'Important points',formula:'Formulas',derivation:'Derivation / proof',example:'Worked examples',revision:'Quick revision',explanation:'Topic explanation'};
 const topic=slide.teacher_blank?.topic||slide.title;
 return {format,label:label[format],request:`Prepare ${label[format].toLowerCase()} for Class ${scope.klass} ${scope.subject}, ${scope.chapter}, topic: ${topic}.\n${instructions[format]}\nUse only matching official evidence. Return well-organised, numbered teaching points for this slide. If evidence is missing, say so rather than inventing notes.`};
}
