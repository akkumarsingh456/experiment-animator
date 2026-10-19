import {describe,it,expect} from 'vitest';
import {medEasyChapterStart,physicsContents,chemistryContents} from '@/lib/med-easy-contents';
const physics='PHYSICS MED EASY 2.0 FULL PDF BY TEAM KOHINOOR.pdf';
const chemistry='CHEMISTRY MED EASY BY - TEAM KOHINOOR .pdf';
describe('owner Med Easy PDF chapter starts',()=>{
 it('uses the screenshot anchors and actual headings rather than a uniform offset',()=>{
  expect(medEasyChapterStart(physics,'Physics','Basic Maths')?.page).toBe(5);
  expect(medEasyChapterStart(chemistry,'Chemistry','Mole Concept')?.page).toBe(8);
  expect(medEasyChapterStart(physics,'Physics','Chapter 5: Magnetism and Matter')?.page).toBe(244);
  expect(medEasyChapterStart(physics,'Physics','Moving Charges and Magnetism')?.page).toBe(230);
  expect(medEasyChapterStart(chemistry,'Chemistry','Biomolecules')?.page).toBe(204);
 });
 it('maps every supplied chapter within its actual PDF',()=>{
  for(const [file,subject,contents,total] of [[physics,'Physics',physicsContents,342],[chemistry,'Chemistry',chemistryContents,247]] as const){
   for(const [title,start,end] of contents){const match=medEasyChapterStart(file,subject,title);expect(match?.printedRange).toEqual({start,end});expect(match!.page).toBeGreaterThan(0);expect(match!.page).toBeLessThanOrEqual(total);}
  }
 });
 it('does not guess unrelated books, subjects, chapters or editions',()=>{
  expect(medEasyChapterStart('PHYSICS MED EASY.pdf','Physics','Atoms')).toBeNull();
  expect(medEasyChapterStart(physics,'Chemistry','Atoms')).toBeNull();
  expect(medEasyChapterStart(physics,'Physics','Unknown')).toBeNull();
 });
});
