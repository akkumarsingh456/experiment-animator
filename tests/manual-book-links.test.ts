import {describe,it,expect,vi} from 'vitest';
import {encodeReferenceVisuals} from '@/lib/reference-visuals';
import {loadManualBookLinks,openManualBookPdf} from '@/lib/manual-book-links.functions';
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>({inputValidator:(parse:(data:unknown)=>unknown)=>({handler:(handler:(options:{data:unknown})=>unknown)=>(options:{data:unknown})=>handler({data:parse(options.data)})})})}));
const fixture=vi.hoisted(()=>({signed:vi.fn(async(path:string)=>({data:{signedUrl:`https://example.test/${path}?signed=1`}})),pages:[] as Array<{page_number:number;text:string}>}));
vi.mock('@/integrations/supabase/client.server',()=>({supabaseAdmin:{
 storage:{from:()=>({createSignedUrl:fixture.signed})},
 from:(table:string)=>{const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:{id:'p',class:'Unspecified Class',subject:'Physics',chapter:'',file_name:'PHYSICS MED EASY.pdf',storage_path:'physics.pdf'},error:null}),limit:async()=>({data:table==='ncert_books'?[{id:'p',class:'Unspecified Class',subject:'Physics',chapter:'',file_name:'PHYSICS MED EASY.pdf',storage_path:'physics.pdf'},{id:'c',class:'Unspecified Class',subject:'Chemistry',chapter:'',file_name:'CHEMISTRY MED EASY.pdf',storage_path:'chemistry.pdf'}]:table==='ncert_pages'?fixture.pages:[],error:null})};return query;},
}}));
describe('manual book PDF access',()=>{
 it('streams PDF bytes through the website server without redirecting to storage',async()=>{
  const request=vi.fn(async()=>new Response('%PDF-1.7\nfixture',{headers:{'Content-Type':'application/pdf'}}));vi.stubGlobal('fetch',request);
  try{const response=await openManualBookPdf({data:{id:'p',klass:'Class 12',subject:'Physics'}});expect(response.headers.get('Content-Type')).toBe('application/pdf');expect(response.headers.has('Location')).toBe(false);expect(await response.text()).toContain('%PDF-1.7');expect(request).toHaveBeenCalledOnce();}
  finally{vi.unstubAllGlobals();}
 });
 it('rejects a book outside the requested subject before downloading it',async()=>{
  await expect(openManualBookPdf({data:{id:'p',klass:'Class 12',subject:'Chemistry'}})).rejects.toThrow('matching Med Easy');
 });
 it('returns matching subject PDFs and actual indexed chapter pages',async()=>{
  fixture.pages=[{page_number:5,text:encodeReferenceVisuals('Coulomb law',[],{chapter:'Electric Charges and Fields',match_text:'Coulomb law'})},{page_number:30,text:encodeReferenceVisuals('Current electricity',[],{chapter:'Current Electricity',match_text:'Coulomb law'})}];
  const books=await loadManualBookLinks({data:{klass:'Class 12',subject:'Physics',chapter:'Electric Charges and Fields',topic:'Coulomb law'}});
  expect(books).toHaveLength(1);expect(books[0].name).toBe('PHYSICS MED EASY.pdf');
  expect(books[0].url).toContain('physics.pdf');expect(books[0].pages).toEqual([{page:5,topic:true}]);
 });
 it('does not invent page suggestions or assign senior books to junior classes',async()=>{
  fixture.pages=[];
  const books=await loadManualBookLinks({data:{klass:'Class 12',subject:'Chemistry',chapter:'Solutions',topic:'Concentration'}});
  expect(books[0].pages).toEqual([]);
  expect(await loadManualBookLinks({data:{klass:'Class 9',subject:'Science',chapter:'Atoms',topic:'Atoms'}})).toEqual([]);
 });
});
