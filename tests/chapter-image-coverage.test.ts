import {describe,it,expect} from 'vitest';
import {chaptersFor} from '@/lib/ncert-syllabus';
import {topicScienceDrawing} from '@/lib/topic-science-visuals';
import {renderLessonIllustration} from '@/lib/napkin-infographic';

describe('all senior science chapters receive a chapter model',()=>{
 for(const klass of ['11','12'])for(const subject of ['Physics','Chemistry','Biology'])for(const chapter of chaptersFor(klass,subject)) {
  it(`${klass} ${subject}: ${chapter.chapter}`,()=>{
   const drawing=topicScienceDrawing({title:'Applications',chapter:chapter.chapter},subject);
   expect(drawing,chapter.chapter).not.toBeNull();
   expect(drawing?.drawing).toMatch(/<(?:path|circle|rect|ellipse|polygon|text)/);
  });
 }
 it('resolves a generic topic from key terms before the chapter',()=>{
  expect(topicScienceDrawing({title:'Properties',chapter:'Solutions',keyTerms:[{term:'Carboxylic acid',meaning:'functional group'}]},'Chemistry')?.id).toBe('carbonyl-structure');
 });
 it('does not give electrostatic field lines to another chapter',()=>{
  const wave=renderLessonIllustration({title:'Applications',chapter:'Waves',subject:'Physics'});
  expect(wave).toContain('Wavelength');expect(wave).not.toContain('Electric field:');
 });
});
