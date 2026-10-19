import {afterEach,describe,it,expect,vi} from 'vitest';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {ManualBookPdfViewer} from '@/components/ManualBookPdfViewer';
const f=vi.hoisted(()=>({viewport:vi.fn(()=>({width:500,height:700})),page:vi.fn(),render:vi.fn(()=>({promise:Promise.resolve(),cancel:vi.fn()})),destroy:vi.fn(async()=>{})}));
vi.mock('@/lib/manual-book-links.functions',()=>({openManualBookPdf:async()=>({blob:async()=>new Blob(['%PDF'])})}));
vi.mock('@/lib/pdf-extract',()=>({loadPdfjs:async()=>({getDocument:()=>({destroy:f.destroy,promise:Promise.resolve({numPages:342,loadingTask:{destroy:f.destroy},getPage:f.page})})})}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
describe('PDF reader controls',()=>{
 it('supports typed Go/Enter, navigation, rotate, fit, download controls and page import',async()=>{
  f.page.mockImplementation(async()=>({rotate:0,getViewport:f.viewport,render:f.render}));
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('%PDF-1.7',{headers:{'Content-Type':'application/pdf'}})));
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({} as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>callback(new Blob(['image'],{type:'image/png'})));
  const close=vi.fn(),importPage=vi.fn();const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<ManualBookPdfViewer id="controls" name="Physics.pdf" klass="12" subject="Physics" chapter="Electric Fields" suggestedPages={[40]} initialPage={1} onClose={close} onImport={importPage}/>));
  const dialog=document.querySelector('[role=dialog]')!;
  expect([...dialog.querySelectorAll('strong')].some(text=>text.textContent?.includes('Go to PDF page 40'))).toBe(true);
  const button=(label:string)=>dialog.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  const input=dialog.querySelector<HTMLInputElement>('[aria-label="Go to PDF page"]')!;
  expect(f.page).toHaveBeenLastCalledWith(40);expect(button('First page').disabled).toBe(false);
  await act(async()=>{input.value='40';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await act(async()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
  expect(f.page).toHaveBeenLastCalledWith(40);
  await act(async()=>button('Next page').click());expect(f.page).toHaveBeenLastCalledWith(41);
  await act(async()=>button('Previous page').click());expect(f.page).toHaveBeenLastCalledWith(40);
  await act(async()=>button('Last page').click());expect(f.page).toHaveBeenLastCalledWith(342);expect(button('Next page').disabled).toBe(true);
  await act(async()=>button('First page').click());expect(f.page).toHaveBeenLastCalledWith(1);
  await act(async()=>button('Rotate page clockwise').click());expect(f.viewport).toHaveBeenLastCalledWith(expect.objectContaining({rotation:90}));
  const zoom=dialog.querySelector<HTMLSelectElement>('[aria-label="PDF zoom"]')!;
  await act(async()=>{zoom.value='2';zoom.dispatchEvent(new Event('change',{bubbles:true}));});expect(f.viewport).toHaveBeenLastCalledWith(expect.objectContaining({scale:3}));
  await act(async()=>button('Fit page width').click());expect(f.viewport).toHaveBeenLastCalledWith(expect.objectContaining({scale:1.5}));
  expect([...dialog.querySelectorAll('button')].some(button=>button.textContent?.includes('Page PNG')&&!button.disabled)).toBe(true);
  expect([...dialog.querySelectorAll('button')].some(button=>button.textContent?.trim()==='PDF'&&!button.disabled)).toBe(true);
  const downloads:string[]=[];vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:download');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(){downloads.push(this.download);});
  vi.useFakeTimers();
  await act(async()=>[...dialog.querySelectorAll('button')].find(button=>button.textContent?.trim()==='PDF')!.click());
  [...dialog.querySelectorAll('button')].find(button=>button.textContent?.includes('Page PNG'))!.click();
  expect(downloads).toEqual(['Physics.pdf','book-page-1.png']);vi.runOnlyPendingTimers();vi.useRealTimers();
  await act(async()=>{input.value='999';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await act(async()=>[...dialog.querySelectorAll('button')].find(button=>button.textContent==='Go')!.click());
  expect(dialog.querySelector('[role=alert]')?.textContent).toContain('1 to 342');
  await act(async()=>[...dialog.querySelectorAll('button')].find(button=>button.textContent?.includes('Use this page image'))!.click());
  expect(importPage).toHaveBeenCalledWith(expect.objectContaining({name:'book-page-1.png',type:'image/png'}));expect(close).toHaveBeenCalledOnce();
  await act(async()=>root.unmount());host.remove();
 });
});


it("opens an explicitly selected saved page instead of overriding it with the first suggestion", async () => {
  f.page.mockImplementation(async()=>({rotate:0,getViewport:f.viewport,render:f.render}));
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({} as CanvasRenderingContext2D);
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<ManualBookPdfViewer id="specific-page" name="Physics.pdf" klass="12" subject="Physics" chapter="Moving Charges and Magnetism" suggestedPages={[209,211]} initialPage={211} onClose={()=>{}} onImport={()=>{}}/>));
  expect(f.page).toHaveBeenLastCalledWith(211);
  await act(async()=>root.unmount());host.remove();
});

it("shows an unresolved chapter clearly and allows deliberate manual navigation", async () => {
  f.render.mockClear();
  f.page.mockImplementation(async()=>({rotate:0,getViewport:f.viewport,render:f.render,getTextContent:async()=>({items:[]})}));
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({} as CanvasRenderingContext2D);
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<ManualBookPdfViewer id="unindexed-chapter" name="Physics.pdf" klass="12" subject="Physics" chapter="Moving Charges and Magnetism" initialPage={1} onClose={()=>{}} onImport={()=>{}}/>));
  expect(document.querySelector('[role=dialog]')?.textContent).toContain('no verified page');
  expect(f.render).not.toHaveBeenCalled();
  const input=document.querySelector<HTMLInputElement>('[aria-label="Go to PDF page"]')!;
  await act(async()=>{input.value='209';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await act(async()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
  expect(f.page).toHaveBeenLastCalledWith(209);expect(f.render).toHaveBeenCalled();
  await act(async()=>root.unmount());host.remove();
});
