import {it,expect,vi,beforeEach} from 'vitest';
import {NCERT_SYLLABUS,subtopicsFor} from '@/lib/ncert-syllabus';
const mocks=vi.hoisted(()=>({chat:vi.fn(),sources:vi.fn()}));
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{let parse=(v:unknown)=>v;const builder={inputValidator:(fn:typeof parse)=>{parse=fn;return builder;},handler:(fn:Function)=>(input:{data:unknown})=>fn({data:parse(input.data)})};return builder;}}));
vi.mock('@/lib/topic-chat-providers.server',()=>({hasTopicChatProvider:()=>true,topicChatDrafts:vi.fn()}));
vi.mock('@/lib/teacher-gemini-chat.server',()=>({teacherGeminiChat:mocks.chat}));
vi.mock('@/lib/topic-notes-sources.server',()=>({readTopicNotesSources:mocks.sources}));
import {draftMissingTopicPoints} from '@/lib/missing-topic-ai.functions';
beforeEach(()=>{vi.clearAllMocks();mocks.chat.mockResolvedValue({provider:'Gemini',label:'Gemini AI draft',lines:['Reviewed teaching point'],sources:[]});});
for(const [klass,subjects] of Object.entries(NCERT_SYLLABUS))for(const [subject,chapters] of Object.entries(subjects))for(const row of chapters){
 it(`routes Add notes without requiring source extraction: ${klass}/${subject}/${row.chapter}`,async()=>{
  const topic=subtopicsFor(klass,subject,row.chapter)[0]||row.chapter;
  await draftMissingTopicPoints({data:{klass,subject,chapter:row.chapter,topic:topic+' — Page 2',teacherChat:true,recoveryOnly:true,format:'formula'}});
  expect(mocks.chat).toHaveBeenCalledWith(expect.objectContaining({klass,subject,chapter:row.chapter,topic}),expect.objectContaining({format:'formula'}));
  expect(mocks.sources).not.toHaveBeenCalled();
 });
}
it('routes the reported Nuclei reference as a chapter formula request',async()=>{
 await draftMissingTopicPoints({data:{klass:'12',subject:'Physics',chapter:'Chapter 13: Nuclei',topic:'Nuclei — Formula reference',teacherChat:true,recoveryOnly:true,format:'formula'}});
 expect(mocks.chat).toHaveBeenCalledWith({klass:'12',subject:'Physics',chapter:'Chapter 13: Nuclei',topic:'Nuclei'},expect.objectContaining({format:'formula'}));
});
