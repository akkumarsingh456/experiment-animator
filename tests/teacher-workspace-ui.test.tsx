import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({account:{signedIn:false,admin:false,email:'',name:''},refresh:vi.fn(),google:vi.fn(),otp:vi.fn(),list:vi.fn(),navigate:vi.fn()}));
vi.mock('@/hooks/use-teacher-account',()=>({useTeacherAccount:()=>({account:mocks.account,checking:false,error:'',refresh:mocks.refresh})}));
vi.mock('@tanstack/react-router',()=>({Link:({children,to,...rest}:any)=><a href={to} {...rest}>{children}</a>,useNavigate:()=>mocks.navigate}));
vi.mock('@/integrations/lovable',()=>({lovable:{auth:{signInWithOAuth:mocks.google}}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{signInWithOtp:mocks.otp,signOut:vi.fn()}}}));
vi.mock('@/lib/teacher-workspace.functions',()=>({listTeacherLessons:mocks.list}));
import {TeacherWorkspace} from '@/components/TeacherWorkspace';
let host:HTMLDivElement,root:ReturnType<typeof createRoot>;
beforeEach(()=>{vi.clearAllMocks();sessionStorage.clear();mocks.account={signedIn:false,admin:false,email:'',name:''};mocks.google.mockResolvedValue({redirected:true});mocks.otp.mockResolvedValue({error:null});host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
it('offers optional teacher sign-in without reading private lessons while signed out',async()=>{
 await act(async()=>root.render(<TeacherWorkspace/>));
 expect(host.textContent).toContain('Teacher sign-in');expect(host.textContent).toContain('remain available without signing in');expect(mocks.list).not.toHaveBeenCalled();expect(host.textContent).not.toContain('Upload books');
});
it('returns Google teacher sign-in to the allowlisted workspace callback',async()=>{
 await act(async()=>root.render(<TeacherWorkspace/>));const button=[...host.querySelectorAll('button')].find(node=>node.textContent==='Continue with Google')!;
 await act(async()=>button.click());expect(sessionStorage.getItem('library-login-return')).toBe('/workspace');expect(mocks.google).toHaveBeenCalledWith('google',expect.objectContaining({redirect_uri:expect.stringContaining('/auth/callback'),extraParams:{prompt:'select_account'}}));
});
it('shows saved lesson errors rather than claiming the workspace is empty',async()=>{
 mocks.account={signedIn:true,admin:false,email:'teacher@example.com',name:'Teacher'};mocks.list.mockRejectedValue(new Error('Private storage unavailable'));
 await act(async()=>root.render(<TeacherWorkspace/>));expect(host.querySelector('[role="alert"]')?.textContent).toContain('Private storage unavailable');expect(host.textContent).not.toContain('No cloud lessons saved yet');
});
it('opens, presents and downloads a past lecture through one-click scoped actions',async()=>{
 const scope={klass:'12',subject:'Chemistry',chapter:'Chemical Kinetics',topic:'Rate of reaction',subtopics:'',mode:'topic' as const};
 const id='11111111-1111-4111-8111-111111111111';
 mocks.account={signedIn:true,admin:false,email:'teacher@example.com',name:'Teacher'};
 mocks.list.mockResolvedValue({items:[{id,revision:id,title:'Chemical Kinetics',scope,savedAt:new Date().toISOString(),slides:20}],nextOffset:null});
 await act(async()=>root.render(<TeacherWorkspace/>));
 for(const [label,action] of [['Open saved lesson','open'],['Present','present'],['Download PDF','pdf']]){
  const button=[...host.querySelectorAll('button')].find(node=>node.textContent===label)!;
  await act(async()=>button.click());
  expect(mocks.navigate).toHaveBeenLastCalledWith({to:'/generate',search:{...scope,workspaceId:id,workspaceAction:action,go:''}});
 }
});
