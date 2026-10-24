import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({read:vi.fn(),ai:vi.fn()}));
vi.mock('@tanstack/react-start',()=>({useServerFn:(fn:unknown)=>fn}));
vi.mock('@/lib/topic-notes.functions',()=>({getSimpleTopicNotes:mocks.read}));
vi.mock('@/lib/missing-topic-ai.functions',()=>({draftMissingTopicPoints:mocks.ai}));
import {TopicNotesChat} from '@/components/TopicNotesChat';
const scope={klass:'12',subject:'Chemistry',chapter:'Chapter 10: Biomolecules',topic:'Carbohydrates'};
let host:HTMLDivElement,root:ReturnType<typeof createRoot>;
const extract=vi.fn();
const points=['Carbohydrates include glucose and fructose.','Glucose is a monosaccharide.'];
const result={lines:points,sources:[],label:'Saved textbook excerpt'};
function button(label:string){return Array.from(host.querySelectorAll('button')).find(b=>b.textContent===label)!;}
function preview(){return host.querySelector<HTMLTextAreaElement>('#simple-topic-notes')!;}
async function render(current=scope){await act(async()=>root.render(<TopicNotesChat scope={current} previewKey="lecture-a" onExtract={extract}/>));}
beforeEach(()=>{vi.resetAllMocks();localStorage.clear();host=document.createElement('div');document.body.append(host);root=createRoot(host);mocks.ai.mockResolvedValue({...result,provider:'AI'});mocks.read.mockResolvedValue(result);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
it('shows returned points and extracts only after the teacher clicks Extract notes',async()=>{await render();expect(button('Insert notes').disabled).toBe(true);await act(async()=>button('Send').click());expect(preview().value).toBe(points.join('\n'));expect(button('Insert notes').disabled).toBe(false);expect(extract).not.toHaveBeenCalled();await act(async()=>button('Insert notes').click());expect(extract).toHaveBeenCalledWith(points,[]);});
it('falls back to source points when AI is not configured and explains their origin',async()=>{mocks.ai.mockRejectedValue(new Error('Connect Gemini by adding GEMINI_API_KEY'));await render();await act(async()=>button('Send').click());expect(preview().value).toBe(points.join('\n'));expect(host.textContent).toContain('Gemini connection needs setup');expect(host.textContent).toContain('not a new AI response');expect(button('Insert notes').disabled).toBe(false);});
it('retains preview when a retry fails',async()=>{await render();await act(async()=>button('Send').click());mocks.ai.mockRejectedValue(new Error('AI temporarily unavailable'));mocks.read.mockRejectedValue(new Error('Sources temporarily unavailable'));await act(async()=>button('Send').click());expect(preview().value).toBe(points.join('\n'));expect(host.textContent).toContain('Your previous preview is kept');expect(button('Insert notes').disabled).toBe(false);});
it('restores a preview after reopening and keeps other topics separate',async()=>{await render();await act(async()=>button('Send').click());await act(async()=>root.unmount());root=createRoot(host);await render();expect(preview().value).toBe(points.join('\n'));await render({...scope,topic:'Proteins'});expect(preview().value).toBe('');expect(button('Insert notes').disabled).toBe(true);});
it('does not pretend an unavailable response contains points',async()=>{mocks.ai.mockRejectedValue(new Error('AI service unavailable'));mocks.read.mockRejectedValue(new Error('Sources unavailable'));await render();await act(async()=>button('Send').click());expect(preview().value).toBe('');expect(button('Insert notes').disabled).toBe(true);expect(host.textContent).toContain('AI service unavailable');expect(host.textContent).toContain('No readable points are available yet');});
it('ignores an older request when the teacher changes topic',async()=>{let finish!:(value:unknown)=>void;mocks.ai.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));await render();await act(async()=>button('Send').click());await render({...scope,topic:'Proteins'});await act(async()=>finish({...result,provider:'AI'}));expect(preview().value).toBe('');expect(host.textContent).toContain('Your request · Class 12 · Proteins');});

it('keeps Gemini-only requests scoped to the selected class and shows a readable Vitamins fallback',async()=>{
 const {reviewedPopupSource}=await import('@/lib/topic-popup-sources.server');
 const {recoverTopicFromSources}=await import('@/lib/topic-source-recovery');
 const vitamins={...scope,topic:'Vitamins'};const source=reviewedPopupSource(vitamins)!;
 const lines=recoverTopicFromSources('Vitamins',[source.text]).lines;
 mocks.ai.mockRejectedValue(new Error('The Gemini backend could not be reached. Please retry.'));
 mocks.read.mockResolvedValue({lines,sources:[{url:source.url,title:source.title}],label:'Official source text - review before extracting'});
 await render(vitamins);await act(async()=>button('Send').click());
 expect(mocks.ai.mock.calls[0][0].data).toMatchObject({...vitamins,provider:'gemini',recoveryOnly:true});
 expect(host.querySelector('[role="log"]')?.textContent).toContain('vitamins');
 expect(host.textContent).toContain('not a new AI response');expect(button('Insert notes').disabled).toBe(false);
 await act(async()=>button('Insert notes').click());expect(extract).toHaveBeenCalledWith(lines,[{url:source.url,title:source.title}]);
});
