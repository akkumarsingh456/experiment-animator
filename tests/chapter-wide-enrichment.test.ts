import {describe,expect,it} from 'vitest';
import {parseBookContents,chapterReadingOrder,contentsHeadingMatches} from '@/lib/book-chapter-priority';
import {sourceFormulaBlocks} from '@/lib/source-derivations';
import {splitMath,isValidLatex} from '@/lib/latex-notation';
import {topicScienceDrawing} from '@/lib/topic-science-visuals';
import {renderLessonIllustration} from '@/lib/napkin-infographic';

describe('chapter-first book reading',()=>{
 it('ignores OCR leader noise after an exact chapter prefix',()=>{
  const rows=parseBookContents('Chemistry','Physical Chemistry RSRV INRA T OER 1-78\n11. Electrochemistry wssssssssNRsIIRIIIICEIIIIIY Ty yr 70-74');
  expect(rows).toEqual([{chapter:'Electrochemistry',start:70,end:74}]);
 });
 it('maps printed contents across physics and chemistry and keeps every PDF page',()=>{
  const chemistry=parseBookContents('Chemistry','Physical Chemistry ........ 1-78\n1. Mole Concept ........ 3-7\n11. Electrochemistry ........ 70-74\n12. Chemical Kinetics ..... 75-78');
  expect(chemistry.map(x=>x.chapter)).toEqual(['Some Basic Concepts of Chemistry','Electrochemistry','Chemical Kinetics']);
  expect(contentsHeadingMatches('Chemistry','11\nELECTRO CHEMISTRY\nDaniell Cell','Electrochemistry')).toBe(true);
  expect(contentsHeadingMatches('Physics','Basic Maths','Basic Maths')).toBe(true);
  const order=chapterReadingOrder(247,76,80);
  expect(order.slice(0,5)).toEqual([76,77,78,79,80]);expect(new Set(order).size).toBe(247);expect([...order].sort((a,b)=>a-b)).toEqual(Array.from({length:247},(_,i)=>i+1));
 });
});

describe('source-backed formulas and derivations with no AI credits',()=>{
 it.each([
  ['Chemistry','Nernst Equation','Nernst equation relates cell potential to reaction quotient.','RT'],
  ['Chemistry','Electrolytic Conductance','Conductivity and resistance are measured using the conducting cell.','RA'],
  ['Chemistry','Faraday electrolysis','Faraday relates charge passed to mass deposited.','zF'],
  ['Physics','Kinematics: uniform acceleration','Motion at constant acceleration.','at'],
  ['Physics','Parallel plate capacitor','A parallel plate capacitor stores charge.','varepsilon'],
 ])('adds complete %s %s proof groups while retaining approved formulas',(subject,title,evidence,symbol)=>{
  const approved=['**Formula:** $V = IR$','**Derivation step 1:** Keep the approved derivation.'];
  const additions=sourceFormulaBlocks(title,subject,[evidence],approved);
  expect(additions.some(l=>l.startsWith('**Formula:'))).toBe(true);
  expect(additions.some(l=>l.startsWith('**Derivation of '))).toBe(true);
  expect(additions.filter(l=>l.startsWith('**Derivation step')).length).toBeGreaterThanOrEqual(2);
  expect(additions.join(' ')).toContain(symbol);
  for(const line of additions)for(const part of splitMath(line))if(part.type!=='text')expect(isValidLatex(part.value),line).toBe(true);
  expect(approved).toEqual(['**Formula:** $V = IR$','**Derivation step 1:** Keep the approved derivation.']);
  expect(sourceFormulaBlocks(title,subject,[evidence],[...approved,...additions])).toEqual([]);
 });
});

describe('shared topic visuals rather than duplicated notes',()=>{
 it.each([
  ['Chemistry','Galvanic cells','galvanic-cell'],['Chemistry','Nernst equation','nernst-graph'],['Chemistry','Electrolytic Conductance','conductivity-cell'],['Chemistry','Batteries','battery-types'],['Chemistry','Corrosion','corrosion'],
  ['Physics','Electric Charges and Fields','electric-field'],['Physics','Gravitation','orbital-motion'],['Physics','Waves','wave'],['Physics','Ray Optics','refraction'],
  ['Biology','Molecular Basis of Inheritance','dna'],['Botany','Photosynthesis','plant-leaf'],['Zoology','Cell: The Unit of Life','biological-cell'],
 ])('draws %s %s with a matched scientific model',(subject,title,id)=>{
  expect(topicScienceDrawing({title},subject)?.id).toBe(id);
  const svg=renderLessonIllustration({title,subject,notes:['UNIQUE_WHOLE_PARAGRAPH_MUST_NOT_BE_COPIED into the image.']});
  expect(svg).toContain('<svg');expect(svg).not.toContain('UNIQUE_WHOLE_PARAGRAPH');expect(svg).not.toContain('Source-based concept map');
 });
 it('does not substitute a Chemistry cell for an unrelated Biology topic',()=>{
  expect(topicScienceDrawing({title:'Electrolytic Conductance'},'Biology')).toBeNull();
 });
});
