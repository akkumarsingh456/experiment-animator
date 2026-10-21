import {it,expect,vi,afterEach} from 'vitest';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {WorkspacePreview} from '@/components/WorkspacePreview';
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers();document.body.innerHTML='';sessionStorage.clear();});
function motion(reduced=false){vi.stubGlobal('matchMedia',()=>({matches:reduced,addEventListener:()=>{},removeEventListener:()=>{}}));vi.spyOn(Math,'random').mockReturnValue(0);sessionStorage.clear();}
it('keeps all eight examples, teaching steps and accessible manual controls',async()=>{
 motion();const host=document.createElement('div');document.body.append(host);const root=createRoot(host);await act(async()=>root.render(<WorkspacePreview/>));
 const seen=new Set<string>();for(let i=0;i<8;i++){seen.add(host.querySelector('h2')!.textContent!);expect(host.querySelectorAll('.edu-sample-outline li')).toHaveLength(4);expect(host.querySelectorAll('[aria-current="step"]')).toHaveLength(1);expect(host.querySelector('svg[role="img"]')?.getAttribute('aria-label')).toBeTruthy();await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Next example"]')!.click());}
 expect(seen.size).toBe(8);expect(host.querySelectorAll('.edu-example-dots button')).toHaveLength(8);await act(async()=>root.unmount());
});
it('advances the explanation and pauses cycling on request',async()=>{
 motion();vi.useFakeTimers();const host=document.createElement('div');document.body.append(host);const root=createRoot(host);await act(async()=>root.render(<WorkspacePreview/>));
 await act(async()=>vi.advanceTimersByTime(2500));expect(host.textContent).toContain('Step 2 of 4');await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Pause examples"]')!.click());const title=host.querySelector('h2')!.textContent;await act(async()=>vi.advanceTimersByTime(20000));expect(host.querySelector('h2')!.textContent).toBe(title);expect(host.textContent).toContain('Step 2 of 4');await act(async()=>root.unmount());
});
it('respects reduced motion while retaining manual navigation',async()=>{
 motion(true);vi.useFakeTimers();const host=document.createElement('div');document.body.append(host);const root=createRoot(host);await act(async()=>root.render(<WorkspacePreview/>));const title=host.querySelector('h2')!.textContent;await act(async()=>vi.advanceTimersByTime(20000));expect(host.querySelector('h2')!.textContent).toBe(title);await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Next example"]')!.click());expect(host.querySelector('h2')!.textContent).not.toBe(title);await act(async()=>root.unmount());
});
