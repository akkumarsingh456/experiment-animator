import {describe, it, expect} from 'vitest';
import {medEasyFormulaSupplement, mergeMedEasySupplements} from '@/lib/med-easy-supplements';
import type {Slide} from '@/lib/generate.functions';
describe('explicit additive Med Easy enrichment', () => {
  it('adds Coulomb law and useful assumptions only with source evidence', () => {
    const lines = medEasyFormulaSupplement('Coulomb’s law', 'Physics', ['Coulomb law: forces between point charges']);
    expect(lines.join(' ')).toContain('varepsilon_0');
    expect(lines.join(' ')).toContain('Doubling separation');
    expect(medEasyFormulaSupplement('Coulomb’s law', 'Physics', ['capacitance'])).toEqual([]);
  });
  it('does not paste broken OCR formulas or import another topic', () => {
    expect(medEasyFormulaSupplement('Capacitance', 'Physics', ['Coulomb $garbled=123$ law'])).toEqual([]);
  });
  it('shares chemistry and physics enrichment without chapter-specific gating', () => {
    expect(medEasyFormulaSupplement('Nernst equation', 'Chemistry', ['Nernst equation']).join(' ')).toContain('Derivation step');
    expect(medEasyFormulaSupplement('First order reaction', 'Chemistry', ['first order kinetics']).join(' ')).toContain('half-life');
    expect(medEasyFormulaSupplement('Resistance and resistivity', 'Physics', ['resistivity']).join(' ')).toContain('ohm metres');
  });
  it('preserves approved objects and is idempotent', () => {
    const original = {title:'Coulomb’s law', kind:'content', notes:['Keep exactly'], sections:[{heading:'Teacher Notes',kind:'bullets',lines:['Original wording']}]} as Slide;
    const payload = [{title:original.title,supplement_lines:medEasyFormulaSupplement(original.title,'Physics',['Coulomb law'])}];
    const [updated] = mergeMedEasySupplements([original], payload);
    expect(updated.notes).toBe(original.notes);
    expect(updated.sections![0]).toBe(original.sections![0]);
    expect(mergeMedEasySupplements([updated],payload)[0]).toBe(updated);
  });
});
