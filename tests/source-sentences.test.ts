import {expect,it} from 'vitest';
import {splitSourceSentences} from '@/lib/source-sentences';
import {selectSlideExcerpts} from '@/lib/ncert-teacher-notes';
it('keeps scientist initials with their names and separates the next sentence',()=>{
 const statement='A basic law regarding flow of currents was discovered by G.S. Ohm in 1828.';
 expect(splitSourceSentences(statement+' Resistance depends on the conductor.')).toEqual([statement,'Resistance depends on the conductor.']);
 expect(splitSourceSentences('J. C. Bose studied radio waves. The next statement follows.')).toEqual(['J. C. Bose studied radio waves.','The next statement follows.']);
});
it('keeps numbered equation and figure references with their source sentence',()=>{
 expect(splitSourceSentences('Consider a conductor satisfying Eq. (3.3), with constant temperature. Compare Fig. 3.2 with Fig. 3.3.')).toEqual(['Consider a conductor satisfying Eq. (3.3), with constant temperature.','Compare Fig. 3.2 with Fig. 3.3.']);
});
it('does not join a missing reference to an unrelated following sentence',()=>{
 expect(splitSourceSentences('Consider Eq. This is a different statement.')).toEqual(['Consider Eq.','This is a different statement.']);
});
it('retains decimal values and normal sentence boundaries',()=>{
 expect(splitSourceSentences('Dr. Bose measured 2.5 V. Is this constant? Check it!')).toEqual(['Dr. Bose measured 2.5 V.','Is this constant?','Check it!']);
 expect(splitSourceSentences('Use e.g. copper for this comparison. Explain why.')).toEqual(['Use e.g. copper for this comparison.','Explain why.']);
});
it('retains complete source evidence through teacher-note selection',()=>{
 const statement='A basic law regarding flow of currents was discovered by G.S. Ohm in 1828, long before its microscopic explanation.';
 const selected=selectSlideExcerpts({title:'Ohm’s law',grounding:statement},statement);
 expect(selected.some(line=>line.includes('G.S. Ohm in 1828'))).toBe(true);
 expect(selected).not.toContain('A basic law regarding flow of currents was discovered by G.S.');
});
