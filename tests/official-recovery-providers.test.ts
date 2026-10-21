import {it,expect,vi,afterEach} from 'vitest';
const mocks=vi.hoisted(()=>({gateway:vi.fn(),read:vi.fn()}));
vi.mock('@/lib/structured-response-client',()=>({hasGatewayKey:()=>true,gatewayJSON:mocks.gateway}));
vi.mock('@/lib/attention-source-read.server',()=>({readAttentionSources:mocks.read,attentionSourceBindings:()=>[]}));
vi.mock('@/integrations/supabase/client.server',()=>({supabaseAdmin:{from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null})})}),upsert:async()=>({})})}}));
vi.mock('@/lib/topic-source-recovery',async importOriginal=>({...await importOriginal<typeof import('@/lib/topic-source-recovery')>(),recoverTopicFromSources:()=>({complete:false,lines:[],attempts:3})}));
import {recoverAttentionTopic} from '@/lib/attention-topic-notes.server';
const lines=[
 'The combining capacity of an atom depends on the number of electrons involved when it forms bonds with other atoms.',
 'Atoms can gain, lose or share electrons during bond formation to obtain an outer electron configuration described by the source.',
 'The number of electrons gained, lost or shared gives the combining capacity used in writing a chemical formula for a compound.',
];
const source={url:'https://ncert.nic.in/textbook/pdf/iesc104.pdf',title:'Structure of the Atom',sourceClass:'9',provider:'NCERT',text:'Valency\n'+lines.join('\n')};
const draft={topic_present:true,notes:lines.map(text=>({heading:'Explanation',text,evidence:[{source:0,quote:text}]}))};
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();mocks.gateway.mockReset();mocks.read.mockReset();});
it('tries the second provider when both primary drafts contain unsupported evidence',async()=>{
 vi.stubEnv('GROQ_API_KEY','test-only-placeholder');
 mocks.read.mockResolvedValue([source]);
 mocks.gateway.mockResolvedValue({topic_present:true,notes:[{heading:'Explanation',text:'Unsupported statement.',evidence:[{source:0,quote:'A quotation that does not exist in the supplied source.'}]}]});
 const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(draft)}}]})));
 const result=await recoverAttentionTopic({klass:'9',subject:'Science',chapter:'Chapter 4: Structure of the Atom (Chemistry)',topic:'Valency'});
 expect(mocks.gateway).toHaveBeenCalledTimes(2);
 expect(fetcher).toHaveBeenCalledTimes(1);
 expect(String(fetcher.mock.calls[0][0])).toBe('https://api.groq.com/openai/v1/chat/completions');
 expect(result?.method).toBe('source-grounded-explanation');
 expect(result?.sections.flatMap(section=>section.lines)).toEqual(lines);
});
it('retries a rejected primary draft and accepts only source-supported notes',async()=>{
 mocks.read.mockResolvedValue([source]);
 mocks.gateway.mockResolvedValueOnce({topic_present:false,notes:[]}).mockResolvedValueOnce(draft);
 const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('No other provider needed'));
 const result=await recoverAttentionTopic({klass:'9',subject:'Science',chapter:'Chapter 3: Atoms and Molecules (Chemistry)',topic:'Writing chemical formulae'});
 expect(mocks.gateway).toHaveBeenCalledTimes(2);
 expect(result?.sections.flatMap(section=>section.lines)).toEqual(lines);
 expect(fetcher).not.toHaveBeenCalled();
});
it('returns no notes when every provider still supplies unsupported information',async()=>{
 vi.stubEnv('GROQ_API_KEY','test-only-placeholder');
 mocks.read.mockResolvedValue([{...source,text:'Isotopes\n'+source.text}]);
 const unsupported={topic_present:true,notes:[{heading:'Explanation',text:'An invented explanation.',evidence:[{source:0,quote:'This supposed quote is absent from the source document.'}]}]};
 mocks.gateway.mockResolvedValue(unsupported);
 vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(unsupported)}}]})));
 expect(await recoverAttentionTopic({klass:'9',subject:'Science',chapter:'Chapter 4: Structure of the Atom (Chemistry)',topic:'Isotopes and isobars'})).toBeNull();
});
