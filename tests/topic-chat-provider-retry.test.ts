import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const mocks=vi.hoisted(()=>({gateway:vi.fn(),key:vi.fn()}));
vi.mock('@/lib/structured-response-client',()=>({hasGatewayKey:mocks.key,gatewayJSON:mocks.gateway}));
import {topicChatDrafts,hasTopicChatProvider} from '@/lib/topic-chat-providers.server';
const options={prompt:'Explain the selected topic using these sources.',schema:{type:'object'}};
const draft={topic_present:true,notes:[]};
function gemini(){return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(draft)}]}}]}));}
function groq(){return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(draft)}}]}));}
async function collect(){const all=[];for await(const item of topicChatDrafts(options))all.push(item);return all;}
beforeEach(()=>{vi.resetAllMocks();for(const key of ['GEMINI_API_KEY','GOOGLE_API_KEY','GROQ_API_KEY'])vi.stubEnv(key,'');mocks.key.mockReturnValue(false);});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
it('does not claim AI availability when no provider is configured',async()=>{expect(hasTopicChatProvider()).toBe(false);expect(await collect()).toEqual([]);});
it('retries a temporary server failure once and returns the recovered response',async()=>{vi.stubEnv('GEMINI_API_KEY','test-placeholder');const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(gemini());expect(await collect()).toEqual([{draft,provider:'Gemini'}]);expect(fetcher).toHaveBeenCalledTimes(2);});
it('retries a temporary network failure once',async()=>{vi.stubEnv('GEMINI_API_KEY','test-placeholder');const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValueOnce(new TypeError('Network unavailable')).mockResolvedValueOnce(gemini());expect(await collect()).toHaveLength(1);expect(fetcher).toHaveBeenCalledTimes(2);});
it('moves past invalid credentials without retrying them',async()=>{vi.stubEnv('GEMINI_API_KEY','test-placeholder');vi.stubEnv('GROQ_API_KEY','test-placeholder');const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(new Response('',{status:401})).mockResolvedValueOnce(groq());expect(await collect()).toEqual([{draft,provider:'Groq'}]);expect(fetcher).toHaveBeenCalledTimes(2);});
it('moves to another provider rather than waiting for a long quota reset',async()=>{vi.stubEnv('GEMINI_API_KEY','test-placeholder');vi.stubEnv('GROQ_API_KEY','test-placeholder');const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(new Response('',{status:429,headers:{'Retry-After':'60'}})).mockResolvedValueOnce(groq());expect(await collect()).toEqual([{draft,provider:'Groq'}]);expect(fetcher).toHaveBeenCalledTimes(2);});
it('stops after one retry when the provider stays unavailable',async()=>{vi.stubEnv('GEMINI_API_KEY','test-placeholder');const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>new Response('',{status:503}));expect(await collect()).toEqual([]);expect(fetcher).toHaveBeenCalledTimes(2);});
it('does not repeat a request that already timed out',async()=>{vi.stubEnv('GEMINI_API_KEY','test-placeholder');const error=new Error('Timeout');error.name='TimeoutError';const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(error);expect(await collect()).toEqual([]);expect(fetcher).toHaveBeenCalledTimes(1);});
it('lets source fallback proceed if the website gateway throws',async()=>{mocks.key.mockReturnValue(true);mocks.gateway.mockRejectedValue(new Error('Gateway unavailable'));expect(await collect()).toEqual([]);});
