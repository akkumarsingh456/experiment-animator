import {describe,it,expect} from 'vitest';
import {secondaryScienceSectionEvidence,substantiveStudyLine} from '@/lib/secondary-study-evidence';
import {sourceDiscussion,learningScaffold,reviewNotes} from '@/lib/learning-design';
import {buildLocalSlides} from '@/lib/generate.functions';
import {NCERT_SYLLABUS} from '@/lib/ncert-syllabus';

describe('Class 9–10 study notes remain substantive',()=>{
 it('does not turn an unavailable-source notice into an activity or learning packet',()=>{
  const sections=[{heading:'Important points',kind:'bullets' as const,lines:['Readable source text for Physical and chemical properties is missing from the selected textbook.']}];
  expect(substantiveStudyLine(sections[0].lines[0])).toBe(false);
  expect(sourceDiscussion('Physical and chemical properties',sections,'Science','10')).toBeUndefined();
  expect(learningScaffold('Properties',sections)).toEqual(sections);
  expect(reviewNotes(sections).ready).toBe(false);
 });
 it('retains explanatory paragraphs under composite physical/chemical headings',()=>{
  const text='3.1 PHYSICAL PROPERTIES\n3.1.1 Metals\nMetals can be beaten into thin sheets. This property is called malleability.\n3.2 CHEMICAL PROPERTIES\nSome metal oxides show both acidic and basic behaviour.\n3.3 IONIC COMPOUNDS\nAn unrelated section must remain outside this topic.';
  const result=secondaryScienceSectionEvidence('Physical and chemical properties',text).join(' ');
  expect(result).toContain('malleability');expect(result).toContain('acidic and basic');expect(result).not.toContain('unrelated section');
 });
 it('keeps procedural steps and exercise questions out of factual topic notes',()=>{
  const text='3.1 Physical properties\nActivity 3.1\nn\nTake a sample and clean it.\nMetals have a shining surface.\nEXERCISES\nGive reasons for each answer.\n3.2 Other topic\nOther information belongs here.';
  const result=secondaryScienceSectionEvidence('Physical properties',text).join(' ');
  expect(result).toContain('shining surface');expect(result).not.toContain('Take a sample');expect(result).not.toContain('Give reasons');
 });
 it('keeps secondary-science discussion and revision short instead of duplicating generic packets',()=>{
  const sections=[{heading:'Topic notes',kind:'bullets' as const,lines:['Metals in their pure state have a shining surface.','Metals can be beaten into thin sheets under a suitable force.','Metals can be drawn into thin wires because they are ductile.']}];
  expect(sourceDiscussion('Metals',sections,'Science','10')?.lines.length).toBe(2);
  expect(learningScaffold('Metals',sections,true).at(-1)?.lines.length).toBe(1);
 });
 it('recognises question headings and lettered textbook subsections',()=>{
  expect(secondaryScienceSectionEvidence('What are living organisms made of?','5.1 What are Living Organisms Made Up of?\nAll living organisms are made of cells.\n5.2 Another section\nDifferent information stays outside.').join(' ')).toContain('made of cells');
  expect(secondaryScienceSectionEvidence('Reproductive health','7.3.3 (d) Reproductive Health\nThe source supplies the explanation in this subsection.\n7.4 Another section\nOther material stays separate.').join(' ')).toContain('source supplies');
 });
 it('retains the current catalog and supplies all configured topics when opening a whole science chapter',()=>{
  for(const grade of ['9','10'])for(const chapter of NCERT_SYLLABUS[grade].Science){
   const source=chapter.subtopics.map((topic,i)=>`${i+1}.1 ${topic.replace(/\s*\([^)]*\)/g,'')}\nThe source explanation for ${topic} contains enough readable detail for the topic.`).join('\n');
   const slides=buildLocalSlides(chapter.chapter,'',source,'Science','topic',grade);
   expect(slides.length,chapter.chapter).toBe(chapter.subtopics.length);
  }
 });
});
