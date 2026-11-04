import React from 'react';
import {createRoot} from 'react-dom/client';
import {act} from 'react';
import {it,expect} from 'vitest';
import {PyqQuestionText} from '@/components/PyqQuestionText';

it('renders question notation with KaTeX and hides garbled debris',async()=>{
 const text='Q15. The mass of a proton is 1.67 × 10^-27 kg.\n\uE000\uE001\u25A1\u25A1\u25A1\nElectrolysis of H2O gives H2 and O2.\n{ }\n(B) State one use of the gas formed at the cathode.';
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<PyqQuestionText text={text} subject="Science"/>));
  const katexHosts=host.querySelectorAll('.katex');
  expect(katexHosts.length).toBeGreaterThanOrEqual(3);
  const panel=host.querySelector('div.rounded-xl')!.textContent!;
  expect(panel).toContain('10−27');
  expect(panel).toContain('(B) State one use of the gas formed at the cathode.');
  expect(panel).not.toMatch(/[\uE000\u25A1]/u);
  expect(panel).not.toContain('× 10^-27');
 }finally{await act(async()=>root.unmount());host.remove();}
});

it('keeps Computer Science code lines verbatim without KaTeX',async()=>{
 const code='Write the output:\nif x:\n    print("{ }")';
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<PyqQuestionText text={code} subject="Computer Science"/>));
  expect(host.querySelector('pre')!.textContent).toBe(code);
  expect(host.querySelectorAll('.katex').length).toBe(0);
 }finally{await act(async()=>root.unmount());host.remove();}
});
