import {afterEach,describe,expect,it,vi} from 'vitest';
import {gatewayJSON,hasGatewayKey} from '@/lib/structured-response-client';

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();});
const options={prompt:'Use the supplied equation.',schemaName:'formula',schema:{type:'object'}};
function stream(events:unknown[]){
 return new Response(events.map(event=>`data: ${JSON.stringify(event)}\n\n`).join('')+'data: [DONE]\n\n');
}
describe('structured response client compatibility after the file rename',()=>{
 it('keeps the no-key fallback without making a request',async()=>{
  vi.stubEnv('LOVABLE_API_KEY','');const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  expect(hasGatewayKey()).toBe(false);expect(await gatewayJSON(options)).toBeNull();expect(fetcher).not.toHaveBeenCalled();
 });
 it('preserves the gateway, model, headers, schema and streamed JSON result',async()=>{
  vi.stubEnv('LOVABLE_API_KEY','test-key');
  const fetcher=vi.fn(async()=>stream([{type:'response.output_text.delta',delta:'{"formula":"V=IR"}'},{type:'response.output_text.done',text:'{"formula":"V=IR"}'}]));
  vi.stubGlobal('fetch',fetcher);
  expect(hasGatewayKey()).toBe(true);expect(await gatewayJSON(options)).toEqual({formula:'V=IR'});
  const [url,init]=fetcher.mock.calls[0] as unknown as [string,RequestInit];
  expect(url).toBe('https://ai.gateway.lovable.dev/v1/responses');
  expect(init.headers).toEqual({'Content-Type':'application/json','Lovable-API-Key':'test-key','X-Lovable-AIG-SDK':'fetch'});
  expect(JSON.parse(init.body as string)).toMatchObject({model:'openai/gpt-6-astra',stream:true,store:false,input:[{role:'user',content:options.prompt}],text:{format:{type:'json_schema',name:'formula',strict:true,schema:options.schema}}});
 });
 it('keeps refusals and failed requests as null instead of altering caller fallbacks',async()=>{
  vi.stubEnv('LOVABLE_API_KEY','test-key');vi.spyOn(console,'warn').mockImplementation(()=>{});
  const fetcher=vi.fn().mockResolvedValueOnce(stream([{type:'response.refusal.done'}])).mockResolvedValueOnce(new Response('Unavailable',{status:503}));
  vi.stubGlobal('fetch',fetcher);
  expect(await gatewayJSON(options)).toBeNull();expect(await gatewayJSON(options)).toBeNull();
 });
});
