import {describe,it,expect,vi,afterEach} from 'vitest';
import {streamManualPdf} from '@/lib/manual-pdf-stream.server';
vi.mock('@/integrations/supabase/client.server',()=>({supabaseAdmin:{from:()=>{const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:{class:'Class 11 & 12',subject:'Physics',file_name:'PHYSICS MED EASY.pdf',chapter:'',storage_path:'physics.pdf'}})};return query;},storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'https://storage.example.test/book.pdf'}})})}}}));
afterEach(()=>vi.unstubAllGlobals());
describe('fast PDF byte-range delivery',()=>{
 it('forwards Range and preserves partial response headers without buffering the file',async()=>{
  const fetchPdf=vi.fn(async(_url:string,_options?:RequestInit)=>new Response('data',{status:206,headers:{'Content-Length':'4','Content-Range':'bytes 0-3/20000000','Accept-Ranges':'bytes'}}));vi.stubGlobal('fetch',fetchPdf);
  const response=await streamManualPdf(new Request('https://website.test/api/med-easy-pdf?id=range&klass=12&subject=Physics',{headers:{Range:'bytes=0-3'}}));
  expect(response.status).toBe(206);expect(response.headers.get('Content-Range')).toBe('bytes 0-3/20000000');expect(response.headers.get('Accept-Ranges')).toBe('bytes');
  expect(new Headers(fetchPdf.mock.calls[0][1]?.headers).get('Range')).toBe('bytes=0-3');expect(await response.text()).toBe('data');
 });
 it('rejects mismatched books and invalid ranges',async()=>{
  expect((await streamManualPdf(new Request('https://website.test/api/med-easy-pdf?id=wrong&klass=12&subject=Chemistry'))).status).toBe(404);
  expect((await streamManualPdf(new Request('https://website.test/api/med-easy-pdf?id=range&klass=12&subject=Physics',{headers:{Range:'bad'}}))).status).toBe(400);
 });
});
