import {describe,it,expect} from 'vitest';
import {chaptersFor} from '@/lib/ncert-syllabus';
import {topicScienceDrawing} from '@/lib/topic-science-visuals';
import {renderLessonIllustration} from '@/lib/napkin-infographic';

describe('all senior science chapters receive a chapter model',()=>{
 it.each([
  ['Biology','Respiration in Plants','cellular-respiration'],
  ['Botany','Cellular respiration','cellular-respiration'],
  ['Zoology','Animal Kingdom','classification-tree'],
  ['Biology','Meiosis','meiosis'],['Biology','Cell cycle','cell-cycle'],
  ['Physics','Plane mirror','mirror-reflection'],['Physics','Transformer','transformer'],
  ['Physics','Alternating current','alternating-current'],['Physics','Photoelectric effect','photoelectric-effect'],
  ['Physics','Projectile motion','projectile-motion'],['Physics','Kinetic Theory','gas-particles'],
  ['Chemistry','Molecular structure','atomic-bonding'],['Chemistry','Biomolecules','molecular-arrangement'],
  ['Chemistry','Phenol','phenol-structure'],['Chemistry','Arrhenius equation','arrhenius-plot'],
  ['Science','Plane mirror','mirror-reflection'],['Science','Animal Kingdom','classification-tree'],
 ])('selects a specific %s %s visual',(subject,title,id)=>{
  expect(topicScienceDrawing({title},subject)?.id).toBe(id);
 });
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
