import {describe,it,expect} from 'vitest';
import {noteSheetCapacity} from '@/components/PagedNoteSections';
import {paginateLectureSections} from '@/lib/lecture-pages';
import {formulaPresentation} from '@/lib/formula-presentation';
import {MathText} from '@/components/MathText';
import {renderToStaticMarkup} from 'react-dom/server';
describe('mass defect sparse-slide regressions',()=>{
 it('uses the full available viewport rather than the short natural card height',()=>{
  const host=document.createElement('div'),box=document.createElement('div');host.append(box);host.style.rowGap='6px';box.style.padding='14px 0 18px';document.body.append(host);
  Object.defineProperty(host,'clientHeight',{value:600});Object.defineProperty(box,'clientHeight',{value:100});
  expect(noteSheetCapacity(host,box)).toBe(568);host.remove();
 });
 it('subtracts a real header while retaining the remaining slide capacity',()=>{
  const host=document.createElement('div'),header=document.createElement('div'),box=document.createElement('div');host.append(header,box);host.style.rowGap='6px';document.body.append(host);
  Object.defineProperty(host,'clientHeight',{value:600});Object.defineProperty(header,'offsetHeight',{value:50});Object.defineProperty(box,'clientHeight',{value:100});
  expect(noteSheetCapacity(host,box)).toBe(544);host.remove();
 });
 it('packs short practice points together without dropping or rewriting them',()=>{
  const lines=['**Support practice:** Complete: It means ...;','**Support practice:** the source supports this because ...','**Core practice:** Explain a process or relationship in this topic.','**Core practice:** Give the steps or reasons and point to the source evidence.','**Challenge practice:** Compare two ideas or cases.','**Answers and explanations:** Check the sequence and reasons against the source.'];
  const sections=[{heading:'Learning and practice',kind:'bullets' as const,lines}];const before=JSON.stringify(sections);const pages=paginateLectureSections(sections);
  expect(pages).toHaveLength(1);expect(pages.flatMap(page=>page.flatMap(section=>section.lines))).toEqual(lines);expect(JSON.stringify(sections)).toBe(before);
 });
 it('typesets mass defect and its equation reference without altering stored notes',()=>{
  const text='This energy required E b is related to the mass defect by E b = Δ M c 2 (13.8) Example 13.3 Find the energy equivalent of one atomic mass unit, first in Joules and then in MeV.';
  const input=Object.freeze({text});const rendered=formulaPresentation(input.text);
  expect(rendered).toContain(String.raw`E_{b}=\Delta M c^{2}`);expect(rendered).toContain('(13.8) Example 13.3');expect(input.text).toBe(text);
  expect(renderToStaticMarkup(<MathText text={text}/>)).not.toContain('katex-error');
 });
 it('typesets the reported oxygen isotope and mass unit only in the relevant context',()=>{
  const source='Using this, express the mass defect of 16 8 O in MeV/ c 2.';const result=formulaPresentation(source);
  expect(result).toContain(String.raw`{}^{16}_{8}\mathrm{O}`);expect(result).toContain(String.raw`\frac{\mathrm{MeV}}{c^{2}}`);
  expect(formulaPresentation('The numbers 16 8 0 are original data.')).toBe('The numbers 16 8 0 are original data.');
 });
});
