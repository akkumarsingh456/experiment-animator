import {describe,it,expect} from 'vitest';
import {renderLessonIllustration} from '@/lib/napkin-infographic';
import {sourceConceptFacts} from '@/lib/source-concept-map';
import {sourceFormulaExplanations} from '@/lib/med-easy-supplements';
describe('visible page content selects illustrations',()=>{
  it('does not reuse the parent chapter image for different pages',()=>{
    const base={title:'Applications',chapter:'Electrostatic Potential and Capacitance',subject:'Physics',notes:['Repeated parent notes'],keyTerms:[{term:'Capacitance',meaning:'Parent topic'}]};
    const first={...base,sections:[{heading:'Teacher Notes',lines:['**Definition:** A dielectric polarises in the electric field.']}]};
    const second={...base,sections:[{heading:'Teacher Notes',lines:['**Definition:** An equipotential surface has constant potential.']}]};
    expect(renderLessonIllustration(first)).not.toBe(renderLessonIllustration(second));
  });
  it('keeps formula-only maps confined to visible page equations',()=>{
    const input={title:'Relations',notes:['Unrelated parent notes'],sections:[{heading:'Teacher Notes',lines:['**Formula:** $V=IR$']}]};
    expect(sourceConceptFacts(input)).toEqual(['$V=IR$']);
  });
  it('adds conditions and interpretation only for an attested topic',()=>{
    expect(sourceFormulaExplanations('Ohm law','Physics',['Ohm law']).join(' ')).toContain('temperature');
    expect(sourceFormulaExplanations('Ohm law','Physics',['Pendulum period'])).toEqual([]);
  });
});
