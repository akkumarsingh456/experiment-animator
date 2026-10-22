import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({account:{signedIn:true,admin:false,email:'teacher@example.com',name:'Teacher'},save:vi.fn()}));
vi.mock('@/hooks/use-teacher-account',()=>({useTeacherAccount:()=>({account:mocks.account,checking:false,error:'',refresh:vi.fn()})}));
vi.mock('@tanstack/react-router',()=>({Link:({children,to,...rest}:any)=><a href={to} {...rest}>{children}</a>}));
vi.mock('@/lib/teacher-workspace.functions',()=>({saveTeacherLesson:mocks.save}));
import {TeacherCloudSave} from '@/components/TeacherCloudSave';
import {preparedLectureSnapshot,workspaceLesson} from '@/lib/teacher-workspace';
const scope={klass:'12',subject:'Chemistry',chapter:'Chemical Kinetics',topic:'Rate of reaction',subtopics:'',mode:'topic' as const};
const lesson={slides:[{title:scope.topic,visual:'book',bullets:['Original explanation'],notes:[],key_terms:[]}],source_books:[],context_chars:0,activities:[],activity_matches:[],video:{title:'Lecture',scenes:[]}};
let host:HTMLDivElement,root:ReturnType<typeof createRoot>;
beforeEach(()=>{vi.clearAllMocks();mocks.account={signedIn:true,admin:false,email:'teacher@example.com',name:'Teacher'};mocks.save.mockImplementation(async({data})=>({id:data.id}));host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
it('records one newly prepared lecture without capturing local private edits',async()=>{
 const snapshot=preparedLectureSnapshot(lesson,scope),capture=vi.fn();
 const props={getSnapshot:capture,preparedLesson:workspaceLesson(snapshot),preparedScope:scope,preparedOwnerEmail:'teacher@example.com'};
 await act(async()=>root.render(<TeacherCloudSave {...props}/>));
 expect(mocks.save).toHaveBeenCalledTimes(1);expect(capture).not.toHaveBeenCalled();
 expect(mocks.save.mock.calls[0][0].data).toMatchObject({expectedEmail:'teacher@example.com',snapshot:{lesson,images:[],bookmark:null,blanks:{blanks:[],deleted:null}}});
 await act(async()=>root.render(<TeacherCloudSave {...props}/>));expect(mocks.save).toHaveBeenCalledTimes(1);
 expect(host.textContent).toContain('Prepared lecture saved to your history');
});
it('does not assign an anonymous or other teacher preparation to the current account',async()=>{
 const props={getSnapshot:vi.fn(),preparedLesson:lesson,preparedScope:scope,preparedOwnerEmail:''};
 await act(async()=>root.render(<TeacherCloudSave {...props}/>));expect(mocks.save).not.toHaveBeenCalled();
 await act(async()=>root.render(<TeacherCloudSave {...props} preparedOwnerEmail="other@example.com"/>));expect(mocks.save).not.toHaveBeenCalled();
});
it('does not duplicate a lecture when opening an existing saved backup',async()=>{
 await act(async()=>root.render(<TeacherCloudSave getSnapshot={vi.fn()} initialId="11111111-1111-4111-8111-111111111111" preparedLesson={lesson} preparedScope={scope} preparedOwnerEmail="teacher@example.com"/>));expect(mocks.save).not.toHaveBeenCalled();
});
it('reports failed automatic history saving while leaving manual retry available',async()=>{
 mocks.save.mockRejectedValue(new Error('Unavailable'));
 await act(async()=>root.render(<TeacherCloudSave getSnapshot={vi.fn()} preparedLesson={lesson} preparedScope={scope} preparedOwnerEmail="teacher@example.com"/>));
 expect(host.textContent).toContain('Lecture history saving failed');expect([...host.querySelectorAll('button')].find(node=>node.textContent==='Save to my workspace')?.disabled).toBe(false);
});
