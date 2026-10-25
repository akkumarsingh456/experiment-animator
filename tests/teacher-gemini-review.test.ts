import {beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({draft:vi.fn()}));
vi.mock('@/lib/topic-chat-providers.server',()=>({topicChatDrafts:mocks.draft}));
import {teacherGeminiChat} from '@/lib/teacher-gemini-chat.server';
const scope={klass:'12',subject:'Physics',chapter:'Chapter 13: Nuclei',topic:'Nuclei'};
beforeEach(()=>vi.resetAllMocks());
it('accepts concise reviewed formulas and never displays the unreviewed draft',async()=>{
 let call=0;mocks.draft.mockImplementation(async function*(){yield {provider:'Gemini',draft:{notes:[{heading:'Mass number',text:++call===1?'Unchecked first draft':'$A=Z+N$'}]}};});
 const result=await teacherGeminiChat(scope,{format:'formula',request:'Explain the formulas'});
 expect(result.lines).toEqual(['**Mass number:** $A=Z+N$']);expect(mocks.draft).toHaveBeenCalledTimes(2);
 expect(result.label).toContain('review before teaching');expect(result.sources).toEqual([]);
 for(const [request] of mocks.draft.mock.calls){expect(request.provider).toBe('gemini');expect(request.prompt).toContain('Class 12');expect(request.prompt).toContain('Nuclei');}
});
it('does not expose an unreviewed draft if the review fails',async()=>{
 let call=0;mocks.draft.mockImplementation(async function*(){if(++call===1)yield {provider:'Gemini',draft:{notes:[{heading:'Definition',text:'Unchecked initial draft'}]}};});
 await expect(teacherGeminiChat(scope,{})).rejects.toThrow('finish reviewing');
});

it('splits draft and review into one Gemini call per website request',async()=>{
 mocks.draft.mockImplementation(async function*(){yield {draft:{notes:[{heading:'Wave speed',text:'$v=f\\lambda$'}]}};});
 const waves={klass:'11',subject:'Physics',chapter:'Chapter 14: Waves',topic:'Speed of waves'};
 const draft=await teacherGeminiChat(waves,{chatStep:'draft'});
 expect(draft.lines).toEqual([]);expect(mocks.draft).toHaveBeenCalledTimes(1);
 expect('pendingDraft' in draft).toBe(true);
 const reply=await teacherGeminiChat(waves,{chatStep:'review',reviewDraft:'pendingDraft' in draft?draft.pendingDraft:undefined});
 expect(reply.lines).toHaveLength(1);expect(mocks.draft).toHaveBeenCalledTimes(2);
 expect(mocks.draft.mock.calls[1][0].prompt).toContain('Review this AI-generated');
});
it('rejects malformed supplied review drafts before calling Gemini',async()=>{
 await expect(teacherGeminiChat(scope,{chatStep:'review',reviewDraft:{notes:[]}})).rejects.toThrow();
 expect(mocks.draft).not.toHaveBeenCalled();
});
