import {describe,it,expect} from 'vitest';
import {secondaryScienceSectionEvidence} from '@/lib/secondary-study-evidence';
import {scopeTextbookPages} from '@/lib/lesson-source-scope';
import {cleanNcertDisplayText} from '@/lib/ncert-display-cleanup';
import {hasBrokenSourceMath} from '@/lib/source-note-quality';
import {secondaryMotionFormulas} from '@/lib/secondary-motion-formulas';
import {topicScienceDrawing} from '@/lib/topic-science-visuals';

describe('legacy Class 9 flattened extraction',()=>{
 it('recovers an explicit heading from flattened pages without borrowing the next section',()=>{
  const text='MOTION 8.1 Describing Motion We describe the location of an object by specifying a reference point. Displacement describes the change in position of the object. 8.2 Measuring the Rate of Motion Speed is distance travelled per unit time. This later section must not be borrowed.';
  const result=secondaryScienceSectionEvidence('Description of motion',text).join(' ');
  expect(result).toContain('reference point');expect(result).not.toContain('Speed is');
 });
 it('matches older graphical-method headings for equations',()=>{
  const result=secondaryScienceSectionEvidence('Equations of kinematic motion','8.5 Equations of Motion by Graphical Method When an object moves with uniform acceleration, its velocity changes equally in equal times. 8.6 Uniform Circular Motion Direction changes continuously.').join(' ');
  expect(result).toContain('uniform acceleration');expect(result).not.toContain('Direction changes');
 });
 it('recovers spaced display-font subsection names',()=>{
  expect(secondaryScienceSectionEvidence('Types of mixtures','2.1.1 T YPES OF MIXTURES Homogeneous mixtures have a uniform composition throughout. 2.2 Another section Other facts remain here.').join(' ')).toContain('uniform composition');
 });
 it('recognises repeated chapter-title glyphs at the foot of the opening page',()=>{
  const text='Introductory cell explanation. 5 T T T HE HE HE F F F UNDAMENTAL UNDAMENTAL UNDAMENTAL U U U NIT NIT NIT OF OF OF L L L IFE IFE IFE C hapter 2019-2020';
  expect(scopeTextbookPages([{page_number:1,text}],'The Fundamental Unit of Life',['The Fundamental Unit of Life','Tissues'])).toEqual([text]);
 });
 it('stops at an omitted legacy chapter rather than carrying Sound into health notes',()=>{
  const pages=[{page_number:1,text:'S OUND\nAn explanation of sound.'},{page_number:2,text:'Health explanation. 13 W W W HY HY HY D D D O O O W W W E E E F F F ALL ALL ALL I I I LL LL LL C hapter 2019-2020'}];
  expect(scopeTextbookPages(pages,'Sound',['Sound','Improvement in Food Resources'])).toEqual([pages[0].text]);
 });
 it('does not switch from Motion to another chapter on a mention inside ordinary prose',()=>{
  const names=['Motion','Force and Laws of Motion','Gravitation'];
  const pages=[{page_number:1,text:'FORCE AND LAWS OF MOTION\nAn introduction to force.'},{page_number:2,text:'The motion of a ball changes when a force acts on it.'},{page_number:3,text:'GRAVITATION\nThe attraction between masses.'}];
  expect(scopeTextbookPages(pages,'Motion',names)).toEqual([]);
  expect(scopeTextbookPages(pages,'Force and Laws of Motion',names)).toHaveLength(2);
 });
 it('removes recognised full-year and letter-spaced running titles only',()=>{
  expect(cleanNcertDisplayText('Graphs show motion. 2019-2020 S CIENCE 104')).not.toContain('2019');
  expect(cleanNcertDisplayText('The year 2019 and a distance of 104 m are data.')).toContain('104 m');
 });
 it('rejects the reported joined equations and lost graph fractions',()=>{
  expect(hasBrokenSourceMath('v = u + at s = ut + 1/2 at22as = v2 - u2')).toBe(true);
  expect(hasBrokenSourceMath('a = Change in velocity time taken = BDBD = ADOC')).toBe(true);
  expect(hasBrokenSourceMath('$v=u+at$')).toBe(false);
 });
 it('provides source-attested school notation with conditions and complete derivations',()=>{
  const lines=secondaryMotionFormulas('Equations Of Kinematic Motion','straight-line motion with uniform acceleration','9','Science','Chapter 7: Motion (Physics)');
  expect(lines.join(' ')).toContain('$v^2=u^2+2as$');expect(lines.join(' ')).toContain('signed displacement');
  expect(lines.filter(line=>line.startsWith('**Derivation of'))).toHaveLength(3);
  expect(secondaryMotionFormulas('Equations of kinematic motion','unrelated source','9','Science','Chapter 7: Motion (Physics)')).toEqual([]);
 });
 it('uses topic-specific kinematic schematics even if the notes contain incidental force words',()=>{
  for(const title of ['Graphical Representation Of Motion','Equations Of Kinematic Motion','Rate Of Change Of Velocity'])expect(topicScienceDrawing({title,sections:[{heading:'Important points',kind:'bullets',lines:['A force changes the motion of the object.']}]},'Science')?.id).toBe('motion-velocity-time');
 });
});
