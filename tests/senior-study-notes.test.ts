import {decodeNcertProse} from '@/lib/ncert-prose-decoding';
import {describe,it,expect} from 'vitest';
import {seniorStudyActivity,seniorStudyContent,seniorActivityConclusions,seniorScienceEvidence,isSeniorScienceStudy} from '@/lib/senior-study-notes';
import {buildLocalSlides} from '@/lib/generate.functions';
import {NCERT_SYLLABUS,subtopicsFor} from '@/lib/ncert-syllabus';
import {sourceDiscussion,learningScaffold} from '@/lib/learning-design';
import type {NoteSection} from '@/lib/ncert-teacher-notes';
const notes:NoteSection[]=[{heading:'Teacher Notes',kind:'bullets',lines:[
 '**Definition:** All planets move in elliptical orbits with the Sun at one focus.',
 '**Important point:** The line joining a planet and the Sun sweeps equal areas in equal time intervals.',
 '**Formula:** Kepler\'s third law relates orbital period and semi-major axis: $T^2 \\propto a^3$.',
]}];
describe('Class 11–12 Physics and Chemistry study pattern',()=>{
 it('recovers all three separately headed Newton law sections',()=>{
  const context="4.3 Newton’s first law of motion\nThe first source section explains inertia and the role of net external force.\n4.4 Newton’s second law of motion\nThe second source section explains the rate of change of momentum.\n4.5 Newton’s third law of motion\nThe third source section explains the interaction between two bodies.\n4.6 Friction\nThis separate topic must not enter the law sections.";
  const result=seniorScienceEvidence("Newton's Laws",context).join(' ');
  expect(result).toContain('inertia');expect(result).toContain('momentum');expect(result).toContain('interaction');expect(result).not.toContain('separate topic');
 });
 it('uses a concise topic activity with a source-supported conclusion',()=>{
  const activity=sourceDiscussion("Kepler's laws",notes,'Physics','11');
  expect(activity?.lines).toHaveLength(3);expect(activity?.lines.at(-1)).toMatch(/Activity conclusion/);
  expect(activity?.lines.join(' ')).not.toMatch(/workshop|explainer|teacher checks|materials/i);
  expect(learningScaffold('Kepler',notes,true).at(-1)?.lines).toHaveLength(1);
 });
 it('does not turn missing text or historical fragments into a practical conclusion',()=>{
  const missing=[{heading:'Notes',kind:'bullets' as const,lines:['Readable source text for this topic is missing from the selected textbook.']}];
  expect(seniorStudyActivity('Gravitation',missing)).toBeUndefined();
  const history=[{heading:'Notes',kind:'bullets' as const,lines:['He could extract three elegant laws from the data.']}];
  expect(seniorStudyActivity("Kepler's laws",history)).toBeUndefined();
 });
 it('does not label an enumeration preface, history or flattened equation as a conclusion',()=>{
  const source=[{heading:'Teacher Notes',kind:'bullets' as const,lines:['**Important point:** The three laws of Kepler can be stated as follows: 1.','**Important point:** The gravitational constant was first measured by a scientist in 1798.','**Important point:** Escape velocity follows min E i E GM m V h R = + = (7.31).',...notes[0].lines]}];
  const conclusion=seniorStudyActivity("Kepler's laws",source)?.lines.at(-1)||'';
  expect(conclusion).not.toMatch(/as follows|scientist|7\.31/);expect(conclusion).toContain('conclusion');
 });
 it('does not turn an apparatus arrangement into the learning conclusion',()=>{
  const setup=[{heading:'Topic notes',kind:'bullets' as const,lines:['S1 and S2 are large spheres kept on either side of the masses.','The source drawing shows the masses placed near the beam.','The thread is suspended from the source-specified support.']}];
  expect(seniorStudyActivity('Gravitation',setup)).toBeUndefined();
 });
 it('removes unrelated activities and repeated workshop blocks while preserving factual notes',()=>{
  const mixed=[...notes,{heading:'Classroom discussion',kind:'bullets' as const,lines:['Activity: Evidence workshop — Kepler. Submit a claim.']},{heading:'Experiment',kind:'bullets' as const,lines:['Add copper sulphate solution and observe the colour.']}];
  expect(seniorStudyContent("Kepler's laws",mixed)).toEqual(notes);
 });
 it('removes orphan workshop labels from a merged notes block',()=>{
  const section={...notes[0],lines:[...notes[0].lines,'**Activity:** Evidence workshop.','**Activity source:** He could extract three elegant laws.','**Activity materials:** Selected textbook passage or diagram.']};
  const cleaned=seniorStudyContent("Kepler's laws",[section]);expect(cleaned[0].lines).toEqual(notes[0].lines);
 });
 it('retains numerical source examples even when they do not repeat the topic heading',()=>{
  const example='**NCERT Example / Activity:** Follow the given orbital period data and the supplied worked calculation.';
  const source={...notes[0],lines:[...notes[0].lines,example]};
  expect(seniorStudyContent("Kepler's laws",[source])[0].lines).toContain(example);
 });
 it('preserves a relevant source activity and supplies a conclusion without changing its steps',()=>{
  const activity:NoteSection={heading:'Activity',kind:'bullets',lines:["**Activity:** Analyse Kepler's equal-area statement using the textbook orbit diagram.", '**Activity steps:** Mark the source-described positions and compare the indicated areas.']};
  const result=seniorActivityConclusions("Kepler's laws",[...notes,activity]);
  expect(result[1].lines.slice(0,2)).toEqual(activity.lines);expect(result[1].lines.at(-1)).toContain('Activity conclusion');
 });
 it('marks an absent source result instead of inventing an experiment outcome',()=>{
  const activity:NoteSection={heading:'Experiment',kind:'bullets',lines:['**Activity:** Follow the supplied procedure.']};
  expect(seniorActivityConclusions('Unknown',[activity])[0].lines.at(-1)).toContain('does not establish an outcome');
 });
 it('uses written reaction analysis rather than proposing unsupported chemical mixing',()=>{
  const chemical:NoteSection[]=[{heading:'Teacher Notes',kind:'bullets',lines:['**Definition:** The supplied ethanol example is an oxidation reaction in this source.','**Reaction:** The source shows ethanol changing to ethanoic acid: $A \\rightarrow B$.','**Condition:** Use only the conditions stated next to the source reaction.']}];
  const task=seniorStudyActivity('Ethanol',chemical)?.lines.join(' ');expect(task).toContain('do not perform an additional chemical test');expect(task).toContain('conclusion');
 });
 it('reads a full source section including subordinate explanation, excluding the next topic',()=>{
  const context="7.2 Kepler's Laws\nAll planets move in elliptical orbits with the Sun at one focus.\nThe line joining a planet and the Sun sweeps equal areas in equal times.\n7.3 Universal law of gravitation\nDifferent material begins here.";
  const evidence=seniorScienceEvidence("Kepler's laws",context).join(' ');expect(evidence).toContain('equal areas');expect(evidence).not.toContain('Different material');
 });
 it('decodes the ASCII-offset prose font without guessing isolated mathematical glyphs',()=>{
  const encode=(text:string)=>[...text].map(char=>char.charCodeAt(0)>=32&&char.charCodeAt(0)<=126?String.fromCharCode(char.charCodeAt(0)+0xF000):char).join('');
  expect(decodeNcertProse(encode("7.2 KEPLER'S LAWS"))).toBe("7.2 KEPLER'S LAWS");
  expect(decodeNcertProse(encode('All planets move in elliptical orbits with the Sun at one focus.'))).toContain('elliptical orbits');
  expect(decodeNcertProse(encode('5.7 ENTROPY'),['Entropy'])).toBe('5.7 ENTROPY');
  expect(decodeNcertProse(encode('F = G M m'))).toBe(encode('F = G M m'));
  expect(decodeNcertProse('The symbol \uF061 occurs in a mixed-font equation.')).toContain('\uF061');
 });
 it('covers every current chapter through the shared subtopic registry without changing other subjects',()=>{
  let chapters=0;
  for(const grade of ['11','12'])for(const subject of ['Physics','Chemistry'])for(const chapter of NCERT_SYLLABUS[grade][subject]){
   const topics=subtopicsFor(grade,subject,chapter.chapter);const source=topics.map((topic,i)=>`${i+1}.1 ${topic.replace(/\s*\([^)]*\)/g,'')}\nThe source explanation for ${topic} is retained as its own readable paragraph.`).join('\n');
   expect(buildLocalSlides(chapter.chapter,'',source,subject,'topic',grade).length,`${grade} ${chapter.chapter}`).toBe(topics.length);chapters++;
  }
  expect(chapters).toBe(47);expect(isSeniorScienceStudy('12','Mathematics')).toBe(false);expect(isSeniorScienceStudy('10','Science')).toBe(false);
 });
});
