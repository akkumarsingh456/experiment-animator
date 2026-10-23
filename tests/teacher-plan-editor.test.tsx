import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({save:vi.fn()}));
vi.mock('@/lib/teacher-workspace.functions',()=>({saveTeacherTeachingPlan:mocks.save}));
import {nextClassPlanSlide,withNextClassPlan,nextClassPdfSlides} from '@/lib/next-class-plan';
import type {Slide} from '@/lib/generate.functions';
import {TeacherPlanEditor} from '@/components/TeacherPlanEditor';
import {teacherPlanDraftKey} from '@/lib/teacher-teaching-plan';
const id='11111111-1111-4111-8111-111111111111',revision='22222222-2222-4222-8222-222222222222',owner='teacher@example.com';
const plan={status:'planned' as const,date:'2026-10-25',nextTopics:'Secondary valency',notes:'Bring models'};
let host:HTMLDivElement,root:ReturnType<typeof createRoot>;
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();localStorage.setItem(teacherPlanDraftKey(owner,id),JSON.stringify({plan,baseRevision:''}));host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
it('restores a device draft and clears it only after confirmed private saving',async()=>{
 const saved={lessonId:id,revision,updatedAt:new Date().toISOString(),plan},onSaved=vi.fn();mocks.save.mockResolvedValue(saved);
 await act(async()=>root.render(<TeacherPlanEditor lessonId={id} ownerEmail={owner} topicHint="Valency" onSaved={onSaved}/>));
 expect(host.querySelector('textarea')?.value).toBe(plan.nextTopics);
 await act(async()=>Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='Save teaching plan')!.click());
 expect(mocks.save).toHaveBeenCalledWith({data:{id,plan:expect.objectContaining(plan),expectedRevision:'',expectedEmail:owner}});
 expect(onSaved).toHaveBeenCalledWith(saved);expect(localStorage.getItem(teacherPlanDraftKey(owner,id))).toBeNull();
 expect(host.textContent).toContain('saved to your private workspace');
});
it('keeps the device draft after cloud failure and allows retry',async()=>{
 mocks.save.mockRejectedValue(new Error('Cloud unavailable'));
 await act(async()=>root.render(<TeacherPlanEditor lessonId={id} ownerEmail={owner} topicHint="Valency" onSaved={vi.fn()}/>));
 await act(async()=>Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='Save teaching plan')!.click());
 expect(host.textContent).toContain('Cloud unavailable');expect(localStorage.getItem(teacherPlanDraftKey(owner,id))).not.toBeNull();expect(host.querySelector('button')!.disabled).toBe(false);
});

it('first topic entry creates a final slide and saves it under the signed-in lecture',async()=>{
 localStorage.clear();
 const onSaved=vi.fn();mocks.save.mockImplementation(async({data})=>({lessonId:data.id,revision,updatedAt:new Date().toISOString(),plan:data.plan}));
 await act(async()=>root.render(<TeacherPlanEditor lessonId={id} ownerEmail={owner} topicHint="Nuclei" onSaved={onSaved} forceOpen/>));
 expect(host.querySelector('details')!.open).toBe(true);
 const topic=host.querySelector<HTMLTextAreaElement>('[aria-label="Next topics to teach"]')!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(topic,'Binding energy and mass defect');topic.dispatchEvent(new Event('input',{bubbles:true}));});
 const draft=JSON.parse(localStorage.getItem(teacherPlanDraftKey(owner,id))!);
 expect(draft.plan).toMatchObject({nextTopics:'Binding energy and mass defect',nextClassSlide:'visible',includeInPdf:true});
 await act(async()=>Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='Save teaching plan')!.click());
 expect(mocks.save).toHaveBeenCalledWith({data:expect.objectContaining({id,expectedEmail:owner,plan:expect.objectContaining({nextClassSlide:'visible',nextTopics:'Binding energy and mass defect'})})});
 expect(onSaved).toHaveBeenCalled();expect(localStorage.getItem(teacherPlanDraftKey(owner,id))).toBeNull();
});
it('editing topics respects an explicitly hidden plan slide',async()=>{
 localStorage.setItem(teacherPlanDraftKey(owner,id),JSON.stringify({plan:{...plan,nextClassSlide:'hidden'},baseRevision:''}));
 await act(async()=>root.render(<TeacherPlanEditor lessonId={id} ownerEmail={owner} topicHint="Nuclei" onSaved={vi.fn()}/>));
 const topic=host.querySelector<HTMLTextAreaElement>('[aria-label="Next topics to teach"]')!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(topic,'New next-class topic');topic.dispatchEvent(new Event('input',{bubbles:true}));});
 expect(JSON.parse(localStorage.getItem(teacherPlanDraftKey(owner,id))!).plan.nextClassSlide).toBe('hidden');
});

it('projects a saved plan as the final slide and PDF page without rewriting the lecture',()=>{
 const original=[{title:'Original lesson',kind:'content',visual:'book',bullets:['Original point'],notes:[],key_terms:[]}] as Slide[];
 const before=JSON.stringify(original),scope={klass:'12',subject:'Physics',chapter:'Nuclei'};
 const planSlide=nextClassPlanSlide({...plan,nextClassSlide:'visible',includeInPdf:true},scope,id)!;
 const combined=withNextClassPlan(original,planSlide);
 expect(combined.at(-1)?.title).toBe('Next Class Plan');expect(combined[0]).toBe(original[0]);expect(JSON.stringify(original)).toBe(before);
 expect(nextClassPdfSlides(combined).at(-1)).toBe(planSlide);
 expect(nextClassPlanSlide({...plan,nextClassSlide:'hidden'},scope,id)).toBeNull();
 expect(nextClassPlanSlide({...plan,nextClassSlide:'off'},scope,id)).toBeNull();
 const excluded=nextClassPlanSlide({...plan,nextClassSlide:'visible',includeInPdf:false},scope,id)!;
 expect(nextClassPdfSlides(withNextClassPlan(original,excluded))).toEqual(original);
});
