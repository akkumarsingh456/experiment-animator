import {expect,it} from 'vitest';
import {teacherTopicPlans} from '@/lib/teacher-topic-plan';
import type {GuidedGroup} from '@/lib/guided-notes';
const plan=(groups:GuidedGroup[])=>teacherTopicPlans([{title:'Kirchhoff’s laws',groups}],'Physics','12')[0];
it('selects a complete explanation rather than a cached fragment or revision instruction',()=>{
 const fact='Kirchhoff’s junction rule expresses conservation of charge at a junction.';
 const groups:GuidedGroup[]=[{heading:'Important points',kind:'list',lines:[
  'Consider a conductor satisfying Eq.',
  'Explain Kirchhoff’s laws without looking, then check your key terms against these notes.',
  '**Revision check:** Explain the topic with evidence.',fact,
 ]}];
 const before=JSON.stringify(groups);
 expect(plan(groups).anchor).toBe(fact);
 expect(JSON.stringify(groups)).toBe(before);
});
it('leaves the anchor absent when there is no readable factual evidence',()=>{
 expect(plan([{heading:'Important points',kind:'list',lines:['Explain Kirchhoff’s laws without looking, then check your notes.']}]).anchor).toBeUndefined();
});
it('does not model damaged or empty worked examples',()=>{
 expect(plan([{heading:'Worked examples',kind:'list',lines:['','The second slab is.']}]).example).toBeUndefined();
});
it('preserves a complete source relation and a complete worked example',()=>{
 const formula='For an ohmic resistor at fixed temperature, $V=IR$ relates voltage and current.';
 const example='For $V=6$ V and $R=3$ ohms, $I=V/R=2$ A.';
 const result=plan([{heading:'Formulas and relations',kind:'formula',lines:[formula]},{heading:'Worked examples',kind:'list',lines:[example]}]);
 expect(result.anchor).toBe(formula);expect(result.example).toBe(example);
});
