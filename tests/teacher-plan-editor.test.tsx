import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({save:vi.fn()}));
vi.mock('@/lib/teacher-workspace.functions',()=>({saveTeacherTeachingPlan:mocks.save}));
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
