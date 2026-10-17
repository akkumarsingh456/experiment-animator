import {describe,it,expect} from 'vitest';
import {withPhysicsDimensions} from '@/lib/physics-dimensions';
import {repairSourceMathSlide} from '@/lib/source-math-repair';
import {topicScienceDrawing} from '@/lib/topic-science-visuals';
import {renderToStaticMarkup} from 'react-dom/server';
import {LessonPreparation} from '@/components/LessonPreparation';
import type {Slide} from '@/lib/generate.functions';
describe('topic-specific atomic presentation',()=>{
 it('does not add generic MLT cards for incidental quantities in atomic model prose',()=>{
  for(const title of ['Rutherford Model','Bohr Model','Atomic Spectra'])expect(withPhysicsDimensions([{heading:'Key points',kind:'text',lines:['Electrons have charge and experience force; energy is discussed here.']}],'Physics',title)).toHaveLength(1);
 });
 it('adds a named relevant constant only when the source defines its relation',()=>{
  const result=withPhysicsDimensions([{heading:'Formula',kind:'text',lines:['Coulomb constant: k = F r² / (q1 q2).']}],'Physics','Rutherford Model');
  expect(result.at(-1)?.lines.join(' ')).toContain('Coulomb constant');expect(result.at(-1)?.lines.join(' ')).not.toContain('Remember: start with');expect(result.at(-1)?.lines).toHaveLength(1);
 });
 it('removes an old reminder-only MLT appendix without touching source notes',()=>{
  const notes={heading:'Key points',kind:'text' as const,lines:['Atomic spectra contain discrete lines.']};
  expect(withPhysicsDimensions([notes,{heading:'MLT Dimensional Formula',kind:'bullets',lines:['Remember: start with a defining equation, substitute dimensions.']}],'Physics','Atomic Spectra')).toEqual([notes]);
 });
 it('removes only the two requested source-review sentences and keeps every other original entry',()=>{
  const original='  Original damaged formula and exercise option: E = = +  ';
  const slide={title:'Bohr Model',bullets:[],notes:[],sections:[{heading:'Source review — original extraction',kind:'text',lines:['These original entries contain damaged extraction or exercise options whose answer has not been established.','They are retained for comparison with the textbook, not presented as verified formulas or facts.',original]}]} as Slide;
  expect(repairSourceMathSlide(slide).sections?.[0].lines).toEqual([original]);
 });
 it('selects scattering before unrelated current or charge words in the note body',()=>{
  expect(topicScienceDrawing({title:'α Particle Scattering And Impact Parameter',sections:[{heading:'MLT Dimensional Formula',kind:'bullets',lines:['Electric charge | [IT] | Charge = current × time.']} ]},'Physics')?.id).toBe('alpha-scattering');
  expect(topicScienceDrawing({title:'Bohr Model'},'Physics')?.id).toBe('bohr-atom');
  expect(topicScienceDrawing({title:'Atomic Spectra'},'Physics')?.id).toBe('atomic-spectra');
 });
 it('shows the selected chapter and labelled atomic symbols during preparation',()=>{
  const html=renderToStaticMarkup(<LessonPreparation subject="Physics" chapter="Chapter 12: Atoms" startedAt={0}/>);
  expect(html).toContain('Chapter 12: Atoms');expect(html).toContain('Positive nucleus');expect(html).toContain('e⁻');expect(html).not.toContain('Physics chapter notebook');
 });
});
