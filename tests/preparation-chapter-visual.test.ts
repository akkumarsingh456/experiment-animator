import {describe,it,expect} from 'vitest';
import {NCERT_SYLLABUS} from '@/lib/ncert-syllabus';
import {preparationChapterVisual} from '@/lib/preparation-chapter-visual';
describe('preparation chapter visual coverage',()=>{
 for(const [klass,subjects] of Object.entries(NCERT_SYLLABUS))for(const [subject,chapters] of Object.entries(subjects))for(const {chapter} of chapters)it(`${klass} ${subject} ${chapter}`,()=>{
  const visual=preparationChapterVisual(klass,subject,chapter);
  expect(visual.svg).toContain('<svg');expect(visual.caption.length).toBeGreaterThan(10);
  expect(visual.svg).not.toContain('undefined');
 });
 it('shows induction apparatus for the reported chapter',()=>{
  const visual=preparationChapterVisual('12','Physics','Chapter 6: Electromagnetic Induction');
  expect(visual.kind).toBe('diagram');expect(visual.svg).toContain('Conducting coil');
 });
 it('keeps unsupported illustrations explicitly labelled as syllabus roadmaps',()=>{
  expect(preparationChapterVisual('10','English','A Letter to God').kind).toBe('roadmap');
 });
});
