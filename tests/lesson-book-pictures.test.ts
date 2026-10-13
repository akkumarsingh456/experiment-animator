import { describe, expect, it } from 'vitest';
import { mergeLessonBookPictures } from '@/lib/lesson-book-pictures';
import type { Slide } from '@/lib/generate.functions';
import type { ReferenceVisual } from '@/lib/reference-visuals';
const picture: ReferenceVisual = { title:'Chlorine reaction map', kind:'reaction', description:'Original chlorine branches and products', page:120, chapter:'The p-Block Elements', storage_path:'Chemistry/med.pdf.page-120.jpg', url:'https://example.test/page.jpg', aspect:.7, crop:{x:.1,y:.1,width:.8,height:.8} };
describe('adding book pictures to an approved lesson', () => {
 it('changes only picture data and retains exact formulas, derivations and wording', () => {
  const sections = [{heading:'Teacher Notes', kind:'bullets' as const, lines:['**Formula:** $V=IR$', '**Derivation step 1:** Keep these words.']}];
  const slide: Slide = {title:'Chlorine',sections,notes:['Original notes.'],bullets:['Original bullet.'],key_terms:['chlorine'],visual:'book'};
  const [updated] = mergeLessonBookPictures([slide],[{title:'Chlorine',visuals:[picture],formula_lines:['**Formula:** $NEW=UNREQUESTED$']}]);
  expect(updated.sections).toBe(sections); expect(updated.notes).toBe(slide.notes); expect(updated.bullets).toBe(slide.bullets);
  expect(updated.reference_visuals).toEqual([picture]);
  expect({...updated,reference_visuals:undefined}).toEqual({...slide,reference_visuals:undefined});
 });
 it('does not attach images to a different or edited topic', () => {
  const slide = {title:'Ohm’s Law', kind:'content'} as Slide;
  expect(mergeLessonBookPictures([slide],[{title:'Chlorine',visuals:[picture]}])[0]).toBe(slide);
 });
});
