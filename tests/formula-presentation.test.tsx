import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {MathText} from '@/components/MathText';
import {formulaPresentation} from '@/lib/formula-presentation';
import {splitMath,isValidLatex} from '@/lib/latex-notation';
import {NCERT_SYLLABUS} from '@/lib/ncert-syllabus';
const examples=[
 'Since n e n h = ni2, The number of holes n h = (2.25 × 1032)/(5 × 1022) ~ 4.5 × 109 m −3 2018-19 Physics 478 14.5 p-n JUNCTION A p-n junction is the basic building block.',
 'Since n e n h = ni², The number of holes n h = (2.25 × 10³²)/(5 × 10²²) ~ 4.5 × 10⁹ m −3 2018-19 Physics 478.',
];
describe('shared formula presentation: no source mutation',()=>{
 it.each(examples)('typesets the complete reported semiconductor example: %s',source=>{
  const result=formulaPresentation(source);
  expect(result).toContain(String.raw`n_{e}n_{h}=n_{i}^{2}`);
  expect(result).toContain(String.raw`\frac{2.25\times10^{32}}{5\times10^{22}}`);
  expect(result).toContain(String.raw`\mathrm{m}^{-3}`);
  expect(result).toContain('2018-19 Physics 478');
  expect(renderToStaticMarkup(<MathText text={source}/>)).not.toContain('katex-error');
 });
 it('handles older partially wrapped mass-action fragments',()=>{
  expect(formulaPresentation('Since n e n $h = ni2$, the number of holes follows.')).toContain(String.raw`n_{e}n_{h}=n_{i}^{2}`);
 });
 it('formats plain equations beside authored LaTeX without merging prose into math',()=>{
  const result=formulaPresentation('Keep $x_{1}=2$ unchanged. Then E = mc^2.');
  expect(result).toContain('$x_{1}=2$');expect(splitMath(result).filter(s=>s.type!=='text')).toHaveLength(2);
 });
 it('never interprets arbitrary four-digit numbers as exponents',()=>{
  expect(formulaPresentation('In 1032 a source records 1022 people.')).toBe('In 1032 a source records 1022 people.');
 });
 it('preserves source data, duplicate entries and nonformula wording',()=>{
  const entries=Object.freeze([...examples,examples[0]]);const original=JSON.stringify(entries);
  entries.forEach(source=>renderToStaticMarkup(<MathText text={source}/>));expect(JSON.stringify(entries)).toBe(original);expect(entries).toHaveLength(3);
 });
 const cases=Object.entries(NCERT_SYLLABUS).flatMap(([grade,subjects])=>Object.entries(subjects).flatMap(([subject,chapters])=>chapters.map(chapter=>({grade,subject,title:chapter.chapter}))));
 // Controlled notation fixtures, not certification of every uploaded equation.
 it.each(cases)('$grade $subject $title uses the same valid LaTeX renderer',()=>{
  const fixtures=[String.raw`$\frac{a_{1}}{b^{2}}$`,String.raw`$[M L^{2}T^{-2}]$`,String.raw`$\begin{pmatrix}a&b\\c&d\end{pmatrix}$`,String.raw`$\mathrm{SO}_{4}^{2-}$`,'n f = 1andni = 2, 3'];
  for(const source of fixtures){const result=formulaPresentation(source);for(const part of splitMath(result))if(part.type!=='text')expect(isValidLatex(part.value),part.value).toBe(true);expect(renderToStaticMarkup(<MathText text={source}/>)).not.toContain('katex-error');}
 });
});
