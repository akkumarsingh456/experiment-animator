import {afterEach,describe,it,expect,vi} from 'vitest';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {ManualVisualEditor} from '@/components/ManualVisualEditor';
const fixture=vi.hoisted(()=>({save:vi.fn(async()=>{}),cache:new Map(),books:vi.fn(async()=>[{id:'p',name:'Physics Med Easy.pdf',url:'https://example.test/book.pdf?token=1',pages:[{page:40,topic:true}]}])}));
vi.mock('@/lib/manual-visuals',()=>({manualVisualCache:fixture.cache,loadManualVisuals:async()=>{},saveManualVisual:fixture.save}));
vi.mock('@/lib/manual-book-links.functions',()=>({loadManualBookLinks:fixture.books}));
vi.mock('sonner',()=>({toast:{success:vi.fn(),error:vi.fn()}}));
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();fixture.save.mockClear();});
describe('manual image import UI',()=>{
 it('offers separate sources and a PDF page link',async()=>{
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<ManualVisualEditor storageKey="page" autoUrl="data:image/png;base64,AA==" alt="Diagram" klass="Class 12" subject="Physics" chapter="Fields" topic="Flux"/>));
  expect(host.textContent).toContain('From device');
  const bookButton=[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('From Med Easy'))!;
  await act(async()=>bookButton.click());
  expect(host.querySelector('a[href$="#page=40"]')).not.toBeNull();expect(host.textContent).toContain('Ctrl+V');
  await act(async()=>root.unmount());host.remove();
 });
 it('pastes an image, opens editing, and saves its data and layout',async()=>{
  vi.stubGlobal('Image',class{width=800;height=600;src='';decode(){return Promise.resolve();}});
  vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:vi.fn()} as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,PASTED');
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<ManualVisualEditor storageKey="paste-page" autoUrl="data:image/png;base64,AA==" alt="Diagram"/>));
  const event=new Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(event,'clipboardData',{value:{items:[{type:'image/png',getAsFile:()=>new File(['test'],'capture.png',{type:'image/png'})}]}});
  await act(async()=>{host.querySelector('.manual-visual-editor')!.dispatchEvent(event);});
  expect(host.querySelector('img[alt="Manually uploaded topic reference"]')?.getAttribute('src')).toContain('PASTED');
  expect(host.querySelector('select')).not.toBeNull();
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Save image'))!.click());
  expect(fixture.save).toHaveBeenCalledWith('paste-page',expect.objectContaining({url:'data:image/png;base64,PASTED',width:85,shape:'rectangle',x:7,y:8}));
  await act(async()=>root.unmount());host.remove();
 });
});
