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
