import type {GuidedGroup} from './guided-notes';
export type TeacherTopicInput={title:string;groups:GuidedGroup[]};
/** Teaching prompts are authored guidance. Factual anchors come only from the
 * current lesson's readable notes, never a guessed model answer. */
export function teacherTopicPlans(topics:TeacherTopicInput[],subject='',klass=''){
 const merged=new Map<string,TeacherTopicInput>();
 for(const topic of topics){const key=topic.title.trim().toLowerCase();const current=merged.get(key);if(current)current.groups.push(...topic.groups);else merged.set(key,{title:topic.title,groups:[...topic.groups]});}
 return [...merged.values()].map(({title,groups})=>{
  const usable=groups.filter(group=>!/^Source (?:review|table)|activity|practice|exit ticket|learning objective|revision|^Before you begin|^Check your understanding|^Answers|^Problem-solving formula reference/i.test(group.heading));
  const rank=(heading:string)=>/definition/i.test(heading)?0:/understanding|how it works/i.test(heading)?1:/important/i.test(heading)?2:3;
  usable.sort((a,b)=>rank(a.heading)-rank(b.heading));
  const anchor=usable.flatMap(group=>group.lines).find(line=>line.length>30&&line.length<700&&!/source text.*missing|re.ingest|needs.*review/i.test(line));
  const example=groups.find(group=>/worked examples|answers and explanations/i.test(group.heading))?.lines.find(line=>line.length<700);
  const formula=usable.some(group=>group.kind==='formula'||group.kind==='derivation');
  const literary=/English|Hindi|Sanskrit/i.test(subject),computing=/Computer|Informatics/i.test(subject),math=/Math/i.test(subject);
  const mode=literary?'text':computing?'code':math?'mathematics':/preparation|manufactur|extraction|process|mechanism/i.test(title)?'process':/compar|difference|versus/i.test(title)?'comparison':/trend|contraction|variation/i.test(title)?'trend':formula?'relation':'concept';
  const models:Record<string,string[]>={
   text:['Read the selected passage aloud; explain unfamiliar words in context.','Model how to support an interpretation with a quotation from this passage.','Ask students to compare two interpretations using textual evidence.'],
   code:['State the problem, inputs and expected output using the example in the notes.','Trace the source example one step at a time; record how values or data change.','Have students explain the output and check one source-supported boundary case.'],
   mathematics:['State the definitions, given information and conditions before starting.','Model the source proof or worked solution without skipping the reason for each step.','Ask students to justify one step independently and check the result against the conditions.'],
   process:['Build a flowchart from the source: starting material → stages → final product.','Place each stated reagent, condition and equation beside its own stage; explain their role using the notes.','Ask students to reconstruct the sequence and check the equations and conditions against the source.'],
   comparison:['Create side-by-side headings for the things named in this topic.','Compare one source-supported property at a time using the same criterion in both columns.','Ask students to explain one similarity and one difference, including any stated exceptions.'],
   trend:['Identify the quantity changing, the direction of change and the range described in the notes.','Separate the source explanation of the cause from its consequences; annotate the stated trend.','Ask students to use that explanation for a source example, retaining any limits or exceptions.'],
   relation:['Name each symbol and quantity before writing the source relation.','Explain the stated conditions; work through the supplied derivation or example in order.','Ask students to interpret the result and check signs, units and assumptions where applicable.'],
   concept:['Introduce the topic using the definition or explanation in the source anchor below.','Unpack one idea at a time and connect it to the source example or labelled diagram, if present.','Ask students to explain the idea independently and identify the line supporting their answer.'],
  };
  return {title,anchor,example,mode,steps:models[mode],goal:`Explain ${title} and justify an answer using the supplied notes.`,
   opener:`Before showing the explanation, ask: “What do you already know about ${title}, and what needs explaining?”`,
   question:mode==='process'?'Why is each stage in this order, and which stated condition is needed at that stage?':mode==='comparison'?'Which comparison criterion supports your answer, and does the source state an exception?':mode==='trend'?'What is the difference between describing this trend and explaining why it occurs?':mode==='text'?'Which exact words in the passage support your interpretation?':mode==='code'?'What changes at this step, and why does the source example produce this output?':mode==='mathematics'||mode==='relation'?'Why is this step or relationship valid here, and what conditions must hold?':'Which part of the source supports your explanation?',
   response:'Accept an answer only when its claim, evidence and explanation agree with the notes. Use the anchor or worked example as the marking reference; do not supply an unsupported model answer.',
   support:/^(?:Class\s*)?(9|10)$/.test(klass)?'Use a vocabulary bank, a labelled sketch and one step at a time; ask students to explain orally before writing.':'Recap prerequisites briefly, then ask for independent reasoning, stated conditions and a justified application.',
   exit:`Explain one key idea from ${title}, cite its supporting source line, and identify one point that still needs clarification.`};
 });
}
