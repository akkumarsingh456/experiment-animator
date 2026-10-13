import {describe,it,expect} from 'vitest';
import {formulaVisualCards} from '@/lib/formula-visual-cards';
import {chemistryStructureDrawing} from '@/lib/chemistry-structure-diagrams';
import {topicScienceDrawing} from '@/lib/topic-science-visuals';
describe('presentation-only enhancements',()=>{
  it('reuses exact source LaTeX, names and units without mutating notes',()=>{
    const source = {sections:[{heading:'Teacher Notes',kind:'formula' as const,lines:[String.raw`**Formula:** Capacitance | $C=\frac{Q}{V}$ | F`]}],notes:['Keep this wording'],bullets:[]};
    const before=JSON.stringify(source);
    expect(formulaVisualCards(source)).toEqual([{label:'Capacitance',expression:String.raw`C=\frac{Q}{V}`,unit:'F'}]);
    expect(JSON.stringify(source)).toBe(before);
  });
  it('does not turn arbitrary prose into new formulas and deduplicates relations',()=>{
    const source = {notes:['This explains a concept.', '**Formula:** $V=IR$', '**Formula:** $V=IR$'],bullets:[]};
    expect(formulaVisualCards(source)).toHaveLength(1);
    expect(formulaVisualCards(source,0)).toEqual([]);
  });
  it('uses distinct substitution examples with explicit electron and stage cues',()=>{
    expect(chemistryStructureDrawing('SN₂ mechanism')?.drawing).toContain('Bond breaks');
    expect(chemistryStructureDrawing('S_N^1 mechanism')?.drawing).toContain('Deprotonation');
    expect(chemistryStructureDrawing('SN1 and SN2 comparison')).toBeNull();
    expect(topicScienceDrawing({title:'SN2 mechanism'},'Chemistry')?.id).toBe('sn2-backside-attack');
    expect(topicScienceDrawing({title:'SN2 mechanism'},'Physics')?.id).not.toBe('sn2-backside-attack');
  });
  it('adds correct lone-pair counts and distinct functional groups',()=>{
    expect(chemistryStructureDrawing('Lewis structure of water')?.drawing).toContain('Two nonbonding');
    expect(chemistryStructureDrawing('Lewis structure of ammonia')?.drawing).toContain('One nonbonding');
    expect(chemistryStructureDrawing('Aldehydes and ketones')?.drawing).toContain('Carboxylic acid');
  });
});
