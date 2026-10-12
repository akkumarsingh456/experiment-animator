import {beforeEach,describe,expect,it,vi}from'vitest';
const f=vi.hoisted(()=>({connect:vi.fn(),submit:vi.fn(),close:vi.fn(),cancel:vi.fn()}));
vi.mock('@gradio/client',()=>({Client:{connect:f.connect}}));
beforeEach(()=>{vi.resetModules();vi.clearAllMocks();vi.stubEnv('HF_IMAGE_TOKEN','hf_private_test_fixture');vi.stubEnv('HF_IMAGES_FREE_ONLY','true');f.connect.mockResolvedValue({submit:f.submit,close:f.close});});
describe('optional free image generation',()=>{
 it('caches a returned image and sends the token only to the approved model-author Space',async()=>{
  f.submit.mockImplementation(()=>Object.assign((async function*(){yield{type:'data',data:[{url:'https://black-forest-labs-flux-1-schnell.hf.space/gradio_api/file=sample.webp'}]};})(),{cancel:f.cancel}));
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,headers:new Headers({'content-type':'image/webp'}),arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer}));
  const {createFreeContextIllustration}=await import('@/lib/hf-image-provider.server');
  const first=await createFreeContextIllustration('Chemistry','Galvanic Cells',['oxidation']);
  expect(first).toBe('data:image/webp;base64,AQID');
  expect(await createFreeContextIllustration('Chemistry','Galvanic Cells')).toBe(first);
  expect(f.connect).toHaveBeenCalledOnce();expect(f.connect.mock.calls[0][0]).toBe('black-forest-labs/FLUX.1-schnell');
  expect(f.submit.mock.calls[0][1].prompt).not.toContain('hf_private');
  expect(f.close).toHaveBeenCalledOnce();vi.unstubAllGlobals();vi.unstubAllEnvs();
 });
 it('stops on free GPU quota and never switches to paid inference',async()=>{
  f.submit.mockImplementation(()=>Object.assign((async function*(){yield{type:'status',stage:'error',message:'Free GPU quota exceeded'};})(),{cancel:f.cancel}));
  const {createFreeContextIllustration}=await import('@/lib/hf-image-provider.server');
  expect(await createFreeContextIllustration('Chemistry','Nernst')).toBeUndefined();
  expect(await createFreeContextIllustration('Physics','Waves')).toBeUndefined();expect(f.connect).toHaveBeenCalledOnce();expect(f.close).toHaveBeenCalledOnce();vi.unstubAllEnvs();
 });
 it('does not download an unexpected URL supplied by the remote service',async()=>{
  f.submit.mockImplementation(()=>Object.assign((async function*(){yield{type:'data',data:[{url:'https://unapproved.example/image.webp'}]};})(),{cancel:f.cancel}));
  vi.stubGlobal('fetch',vi.fn());const {createFreeContextIllustration}=await import('@/lib/hf-image-provider.server');
  expect(await createFreeContextIllustration('Biology','Cell')).toBeUndefined();expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();vi.unstubAllEnvs();
 });
});
