import {hasBrokenSourceMath} from './source-note-quality';
import {latexLineValid} from './notes-verification';
import {decodeNcertProse} from './ncert-prose-decoding';
import type {NoteSection} from './ncert-teacher-notes';
import {secondaryScienceSectionEvidence,substantiveStudyLine} from './secondary-study-evidence';
import {topicEvidence} from './topic-evidence';

export const isSeniorScienceStudy=(klass:string,subject:string)=>/^(?:Class\s*)?(?:11|12)$/i.test(klass.trim())&&/^(?:Physics|Chemistry)$/i.test(subject.trim());
const aliases:Record<string,string[]>={
 'Escape velocity':['Escape speed'], 'Satellites':['Earth satellites','Energy of an orbiting satellite'],
 'Universal law of gravitation':['Universal law of gravitation','The gravitational constant'],
 'Kinematic equations':['Kinematic equations for uniformly accelerated motion'],
 'Stress-strain curves':['Stress strain relationship'], 'Bernoulli\'s principle':['Bernoulli\'s equation'],
 'Ideal gas laws':['Behaviour of gases'], 'Energy in SHM':['Energy in simple harmonic motion'],
 'SI units':['The international system of units'], 'Dimensional analysis':['Dimensional analysis and its applications'],
 'Gauss\'s law and applications':['Gauss\'s law','Applications of Gauss\'s law'],
 'Force on moving charges and current conductors':['Magnetic force','Magnetic force on a current carrying conductor'],
 'Self and mutual induction':['Inductance','Self inductance','Mutual inductance'],
 'Photoelectric effect':['Photoelectric effect','Experimental study of photoelectric effect'],
 'Half-life':['Half life of a reaction'], 'Atomic mass':['Atomic and molecular masses'],
 'Electronic configuration':['Electronic configurations of atoms'], 'Mole concept':['Mole concept and molar masses'],
 'Stoichiometric calculations':['Stoichiometry and stoichiometric calculations'],
 'Concentration terms':['Expressing concentration of solutions'],
 'VSEPR theory':['The valence shell electron pair repulsion theory'],
 'Transition elements properties':['General properties of the transition elements'],
 'Inner transition elements (lanthanoids and actinoids)':['The inner transition elements','The lanthanoids','The actinoids'],
 'Nucleic acids (DNA/RNA)':['Nucleic acids'],
};
const identity=(text:string)=>text.toLowerCase().replace(/[^a-z0-9]/g,'');
export function seniorScienceEvidence(title:string,context:string){
 const alternate=Object.entries(aliases).find(([name])=>identity(name)===identity(title))?.[1]||[];
 return secondaryScienceSectionEvidence(title,decodeNcertProse(context,[title,...alternate]),alternate);
}
const tag=(line:string)=>line.match(/^\*\*([^*]+):\*\*/)?.[1]||'';
const body=(line:string)=>line.replace(/^\*\*[^*]+:\*\*\s*/,'');
const conclusionText=(line:string)=>body(line).replace(/\s+\(?Fig(?:ure)?\.?(?:\s*\d+(?:\.\d+)*)?\)?\.?$/i,'.');
const activityHeading=/^(?:classroom discussion|activity|experiment|investigation)\b/i;
const activityTag=/^(?:activity|experiment|discussion)\b|^(?:worked )?(?:NCERT )?example\s*\/\s*activity\b/i;
const generic=/evidence workshop|selected textbook passage or diagram|work in pairs with an explainer|where did your explanations differ|submit a claim|teacher checks whether the evidence|use a paper model if the source|which part of the source supports your conclusion/i;
const historical=/^(?:he|she|they|it|this|these|those)\s+(?:could|had|was|were|is|are)|\b(?:history|historical|astronomer|born in)\b/i;
const words=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w.length>3&&!['chapter','notes','important','properties','laws','theory','physical','chemical','preparation','classification','reactions','explanation','applications'].includes(w));

/** Remove only generic or mismatched activity blocks; source explanation lines stay intact. */
export function seniorStudyContent(title:string,sections:NoteSection[]):NoteSection[]{
 const terms=words(title),out:NoteSection[]=[];
 for(const section of sections){
  if(section.kind==='diagram'){out.push(section);continue;}
  const isActivity=activityHeading.test(section.heading);
  if(isActivity&&generic.test(section.lines.join(' ')))continue;
  if(isActivity&&terms.length&&!terms.some(term=>words(section.lines.join(' ')).includes(term)))continue;
  const workedExample=(line:string)=>/^(?:worked )?(?:NCERT )?example\s*\/\s*activity/i.test(tag(line));
  const activityLines=section.lines.filter(line=>activityTag.test(tag(line))&&!workedExample(line));
  const genericActivity=activityLines.some(line=>generic.test(line));
  const mismatchedActivity=activityLines.length>0&&terms.length>0&&!terms.some(term=>words(activityLines.join(' ')).includes(term));
  const lines=section.lines.filter(line=>{
   if(workedExample(line)&&!generic.test(line))return true;
   if(activityTag.test(tag(line))&&(genericActivity||mismatchedActivity))return false;
   if(activityTag.test(tag(line))&&generic.test(line))return false;
   return !/^(?:\*\*)?(?:Support practice|Core practice|Challenge practice):.*(?:select a key term|explain a process, relationship|compare two ideas or cases)/i.test(line);
  });
  if(lines.length)out.push({...section,lines});
 }
 return out;
}
function validConclusion(line:string){
 const text=body(line),prose=text.replace(/\$\$[\s\S]*?\$\$|\$[^$]+\$/g,'');
 return text.length<=500&&!/^(?:both|they|it|this|these|those|he|she)\b/i.test(text)
  &&!/^(?:\d+(?:\.\d+)+\s+)?(?:fig(?:ure)?\.?|schematic|diagram|drawing|table)\b/i.test(text)&&!historical.test(text)&&!hasBrokenSourceMath(text)&&!latexLineValid(text).invalid
  &&!/[=∝→⇌]/.test(prose)
  &&!/\b(?:shown|clamped|mounted|suspended|placed|kept)\b|\bS[12]\b|than this\b|as above|see above/i.test(prose)
  &&!/as follows|can be stated|given below|listed below|shown in|as shown|scientist|first done|first measured|first discovered|\b\d+\.\s*$/i.test(text);
}
function conclusionEvidence(title:string,sections:NoteSection[]){
 const terms=words(title);
 const candidates=sections.filter(s=>s.kind!=='diagram'&&!activityHeading.test(s.heading)&&!/^Source (?:review|table)|^MLT |^Problem-solving formula reference/i.test(s.heading))
  .flatMap(s=>s.lines).filter(line=>substantiveStudyLine(line)&&!activityTag.test(tag(line))&&!/^(?:SI unit|unit|variable|dimension|learning|revision)/i.test(tag(line))&&validConclusion(line));
 return candidates.map((line,index)=>({line,index,score:(/conclusion|result|important point|definition|formula|explanation/i.test(tag(line))?3:0)+terms.filter(term=>words(line).includes(term)).length}))
  .sort((a,b)=>b.score-a.score||a.index-b.index)[0]?.line;
}

/** One paper-based task tied to a verified result, never a fabricated practical observation. */
export function seniorStudyActivity(title:string,sections:NoteSection[]):NoteSection|undefined{
 const result=conclusionEvidence(title,sections);if(!result)return;
 if(sections.some(s=>activityHeading.test(s.heading)||s.lines.some(l=>activityTag.test(tag(l)))))return;
 const facts=sections.filter(s=>s.kind!=='diagram').flatMap(s=>s.lines).filter(substantiveStudyLine);
 if(facts.length<3)return;
 const equation=facts.find(l=>/\$[^$]*[=∝→]|\\(?:rightarrow|rightleftharpoons|propto)/.test(l)&&!/dimension|MLT/i.test(l));
 const derivation=facts.some(l=>/^derivation/i.test(tag(l)));
 const graph=facts.find(l=>/^graph|trend/i.test(tag(l)));
 const chemical=equation&&/→|⇌|\\(?:rightarrow|rightleftharpoons)/.test(equation);
 const task=chemical?'Trace the reaction written in these notes. Identify reactants, products and only the stated reagents, conditions and observations. Use the written reaction; do not perform an additional chemical test.'
  :derivation?'Follow the supplied derivation from its starting law to the result. Explain the reason for each step and identify the assumptions stated in the notes.'
  :graph?'Redraw the source graph using its stated axes and labels. Explain the trend and only the slope or intercept meanings given in the notes.'
  :equation?'Use the relation written in these notes. Identify its symbols, check the stated units and conditions, and explain how it describes this topic. Do not invent numerical readings.'
  :'Select the named definition or process in these notes. Explain its features or sequence, then justify the stated result using the source explanation.';
 return {heading:'Activity / source analysis',kind:'bullets',lines:[
  `**Activity:** ${title} — paper-and-pencil source analysis (teacher-designed).`,
  `**Activity steps:** ${task}`,
  `**Activity conclusion (from the notes):** ${conclusionText(result)}`,
 ]};
}

/** Preserve relevant source activities and make an absent conclusion explicit. */
export function seniorActivityConclusions(title:string,sections:NoteSection[]):NoteSection[]{
 const result=conclusionEvidence(title,sections);
 return sections.map(section=>{
  const hasActivity=activityHeading.test(section.heading)||section.lines.some(line=>activityTag.test(tag(line)));
  if(!hasActivity||section.lines.some(line=>/^(?:activity |experiment )?(?:conclusion|inference|learning outcome)/i.test(tag(line))))return section;
  const explicit=section.lines.find(line=>!line.includes('?')&&/\b(?:therefore|thus|this shows|we conclude|we infer)\b/i.test(body(line))&&!generic.test(line)&&validConclusion(line));
  const supported=explicit||result;
  const conclusion=supported?`**Activity conclusion (from the notes):** ${conclusionText(supported)}`:'**Activity conclusion:** The supplied text does not establish an outcome for this activity. A matching source result is needed; no experimental result is inferred.';
  return {...section,lines:[...section.lines,conclusion]};
 });
}
