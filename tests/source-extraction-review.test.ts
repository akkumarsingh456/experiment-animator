import {it,expect} from 'vitest';
import {sourceExtractionIssue,quarantineExtractionSections} from '@/lib/source-extraction-review';
import {verifyNoteSections,normalizeForGrounding} from '@/lib/notes-verification';
import {adequateTopicEvidence} from '@/lib/topic-source-recovery';
import {chemicalTextNotation} from '@/lib/chemical-notation';
it('formats explicit spaced compound counts while leaving isolated table values unchanged',()=>{
 const result=chemicalTextNotation('As 2 O 5, Sb 2 O 3, B 2 H 6, H 2 Se, AlH 3; Li 152 Be 111');
 for(const compound of ['As2O5','Sb2O3','B2H6','H2Se','AlH3'])expect(result).toContain(`\\ce{${compound}}`);
 expect(result).toContain('Li 152 Be 111');
 expect(chemicalTextNotation('$\\frac{a}{b}$')).toBe('$\\frac{a}{b}$');
});
it.each([
 'Property Element Metallic radius M/ pm Li Be B 152 111 88 Na Mg Al 186 160 143 Li Be Ionic radius M + / pm 76 31 Na Mg 102 72 following group i.e., magnesium and aluminium, respectively.',
 'In fact the behaviour of lithium and beryllium is more similar with the second element of the Group 1 2 13 14 15 16 17 Formula LiH B 2 H 6 CH 4 NH 3 H 2 O HF of hydride NaH CaH 2 AlH 3 SiH 4 Formula Li 2 O MgO B 2 O 3 of oxide',
 '3.7 The periodic trends of elements in the periodic -19 93 CLASSIFICATION OF ELEMENTS AND PERIODICITY IN PROPERTIES Non-metallic elements have strong tendency to gain electrons.',
])('recognises the reported additional merged blocks despite surrounding prose',text=>expect(sourceExtractionIssue(text)).toBeTruthy());
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
