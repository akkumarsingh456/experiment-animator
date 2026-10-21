import {it,expect} from 'vitest';
import {sourceExtractionIssue,quarantineExtractionSections} from '@/lib/source-extraction-review';
import {verifyNoteSections,normalizeForGrounding} from '@/lib/notes-verification';
import {adequateTopicEvidence} from '@/lib/topic-source-recovery';
const merged='Property Eka-aluminium Gallium Eka-silicon Germanium (predicted) (found) (predicted) (found) Atomic weight 68 70 72 72.6 Density 5.9 5.94 5.5 5.36 Melting point Low 302.93 High 1231 Formula of oxide E 2 O 3 Ga 2 O 3';
const physical='Material Copper Silver Aluminium Density 8.9 10.5 2.7 Melting point 1358 1235 933 Resistivity 1.7 1.6 2.7 Conductivity 58 63 37 reference properties comparison';
const economic='Country A B C Population 120 130 140 Literacy rate 80 85 90 Life expectancy 65 70 75 Per capita income 1000 2000 3000 comparative statistics';
it.each([merged,physical,economic])('detects flattened entries by structure across subjects',line=>expect(sourceExtractionIssue(line)).toBeTruthy());
it.each(['Density decreases as temperature increases because the liquid expands.','The atomic number is the number of protons in the nucleus.','Atomic weight | Density | Melting point | 68 | 70 | 72 | 5.9 | 5.94 | 5.5 | 300 | 400 |','The formula is $B=\\frac{\\mu_0}{4\\pi}\\frac{2m}{r^3}$.'])('preserves readable prose and structured notation',line=>expect(sourceExtractionIssue(line)).toBeNull());
it('quarantines original content without removing a readable note',()=>{
 const good='The properties of elements are periodic functions of their atomic numbers.';
 const sections=[{heading:'Teacher Notes',kind:'bullets',lines:[merged,good]}];
 const result=quarantineExtractionSections(sections)!;
 expect(result[0].lines).toEqual([good]);
 expect(result[1].heading).toBe('Source review — original extraction');
 expect(result[1].lines).toEqual([merged]);
 expect(quarantineExtractionSections(result)).toBe(result);
 const verified=verifyNoteSections(sections,normalizeForGrounding(merged+' '+good));
 expect(verified.sections.find(section=>section.heading==='Teacher Notes')?.lines).toEqual([good]);
 expect(verified.sections.find(section=>section.heading.startsWith('Source review'))?.lines).toEqual([merged]);
});
it('does not accept copied damaged entries as complete topic evidence',()=>{
 expect(adequateTopicEvidence('Modern Periodic Table',[merged,physical,economic])).toBe(false);
});
it('returns already readable sections unchanged',()=>{
 const sections=[{heading:'Teacher Notes',kind:'bullets',lines:['Atomic radii generally decrease across a period.']}];
 expect(quarantineExtractionSections(sections)).toBe(sections);
});
