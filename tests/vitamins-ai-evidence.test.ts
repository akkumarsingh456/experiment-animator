import {beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({draft:vi.fn(),sources:vi.fn()}));
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{let parse=(v:unknown)=>v;const builder={inputValidator:(fn:typeof parse)=>{parse=fn;return builder;},handler:(fn:Function)=>(input:{data:unknown})=>fn({data:parse(input.data)})};return builder;}}));
vi.mock('@/lib/topic-chat-providers.server',()=>({hasTopicChatProvider:()=>true,topicChatDrafts:mocks.draft}));
vi.mock('@/lib/topic-notes-sources.server',()=>({readTopicNotesSources:mocks.sources}));
vi.mock('@/lib/trusted-chapter-source.server',()=>({trustedChapterSource:vi.fn().mockResolvedValue(null)}));
import {draftMissingTopicPoints} from '@/lib/missing-topic-ai.functions';
import {reviewedPopupSource} from '@/lib/topic-popup-sources.server';
const scope={klass:'12',subject:'Chemistry',chapter:'Chapter 10: Biomolecules',topic:'Vitamins'};
const source=reviewedPopupSource(scope)!;
const points=source.text.split('\n').slice(1,5);
beforeEach(()=>{vi.clearAllMocks();mocks.sources.mockResolvedValue([source]);mocks.draft.mockImplementation(async function*(){yield {provider:'Gemini',draft:{topic_present:true,notes:points.map(text=>({heading:'Important points',text,evidence:[{source:0,quote:text}]}))}};});});
it('passes readable Vitamins evidence to Gemini and accepts supported replies',async()=>{
 const result=await draftMissingTopicPoints({data:{...scope,recoveryOnly:true,request:'Explain Vitamins for my class'}});
 expect(result.lines.length).toBeGreaterThanOrEqual(3);expect(result.provider).toBe('Gemini');
 expect(mocks.draft.mock.calls[0][0].provider).toBe('gemini');
 expect(mocks.draft.mock.calls[0][0].prompt).toContain('Fat soluble vitamins');
 expect(result.sources[0].url).toBe(source.url);
});
it('continues rejecting invented Vitamins evidence',async()=>{
 mocks.draft.mockImplementation(async function*(){yield {provider:'Gemini',draft:{topic_present:true,notes:points.map(text=>({heading:'Important points',text,evidence:[{source:0,quote:'This invented statement is not in the actual textbook source.'}]}))}};});
 await expect(draftMissingTopicPoints({data:{...scope,recoveryOnly:true}})).rejects.toThrow('source-checked notes');
});
