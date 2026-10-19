import {describe,it,expect,vi} from 'vitest';
import {encodeReferenceVisuals} from '@/lib/reference-visuals';
import {loadManualBookLinks,openManualBookPdf} from '@/lib/manual-book-links.functions';
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>({inputValidator:(parse:(data:unknown)=>unknown)=>({handler:(handler:(options:{data:unknown})=>unknown)=>(options:{data:unknown})=>handler({data:parse(options.data)})})})}));
const fixture=vi.hoisted(()=>({bookName:'PHYSICS MED EASY.pdf',queries:[] as string[],signed:vi.fn(async(path:string)=>({data:{signedUrl:`https://example.test/${path}?signed=1`}})),pagesByBook:{} as Record<string,Array<{page_number:number;text:string}>>,pages:[] as Array<{page_number:number;text:string}>}));
vi.mock('@/integrations/supabase/client.server',()=>({supabaseAdmin:{
 storage:{from:()=>({createSignedUrl:fixture.signed})},
 from:(table:string)=>{fixture.queries.push(table);let bookId='';const query={select:()=>query,eq:(column:string,value:string)=>{if(column==='book_id')bookId=value;return query;},maybeSingle:async()=>({data:{id:'p',class:'Unspecified Class',subject:'Physics',chapter:'',file_name:fixture.bookName,storage_path:'physics.pdf'},error:null}),limit:async()=>({data:table==='ncert_books'?[{id:'p',class:'Unspecified Class',subject:'Physics',chapter:'',file_name:fixture.bookName,storage_path:'physics.pdf'},{id:'p-copy',class:'Class 11 & 12',subject:'Physics',chapter:'',file_name:'PHYSICS MED EASY (1).pdf',storage_path:'physics-copy.pdf'},{id:'c',class:'Unspecified Class',subject:'Chemistry',chapter:'',file_name:'CHEMISTRY MED EASY.pdf',storage_path:'chemistry.pdf'}]:table==='ncert_pages'?(fixture.pagesByBook[bookId]||fixture.pages):[],error:null})};return query;},
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
  expect(books[0].url).toContain('/api/med-easy-pdf?id=p');expect(books[0].pages).toEqual([{page:5,topic:true}]);
 });
 it('does not invent page suggestions or assign senior books to junior classes',async()=>{
  fixture.pages=[];
  const books=await loadManualBookLinks({data:{klass:'Class 12',subject:'Chemistry',chapter:'Solutions',topic:'Concentration'}});
  expect(books[0].pages).toEqual([]);
  expect(await loadManualBookLinks({data:{klass:'Class 9',subject:'Science',chapter:'Atoms',topic:'Atoms'}})).toEqual([]);
 });
 it('reports contents page numbers separately when physical PDF pages are unverified',async()=>{
  fixture.pages=[{page_number:2,text:encodeReferenceVisuals('Electromagnetic Induction 251-260',[],{chapter:'',match_text:'Electromagnetic Induction 251-260'})}];
  const books=await loadManualBookLinks({data:{klass:'Class 12',subject:'Physics',chapter:'Chapter 6: Electromagnetic Induction',topic:'Faraday law'}});
  expect(books).toHaveLength(1);expect(books[0].pages).toEqual([]);expect(books[0].printedRange).toEqual({start:251,end:260});
 });
});


it("recognises a saved chapter heading without optional chapter metadata", async () => {
  fixture.pages=[{page_number:209,text:"Moving Charges and Magnetism\nBiot-Savart law\nThe magnetic field of a current carrying conductor."},
    {page_number:210,text:"Current Electricity\nBiot-Savart mentioned in another chapter."}];
  const books=await loadManualBookLinks({data:{klass:"12",subject:"Physics",chapter:"Chapter 4: Moving Charges and Magnetism",topic:"Biot-Savart"}});
  expect(books[0].pages).toEqual([{page:209,topic:true}]);
});


it("does not merge PDF page numbers across differently paginated duplicate uploads", async () => {
  fixture.pagesByBook={
    p:[{page_number:209,text:"Moving Charges and Magnetism\nBiot-Savart law"}],
    "p-copy":[{page_number:211,text:"Moving Charges and Magnetism\nBiot-Savart law"}],
  };
  try {
    const books=await loadManualBookLinks({data:{klass:"12",subject:"Physics",chapter:"Moving Charges and Magnetism",topic:"Biot-Savart"}});
    expect(books).toHaveLength(1);expect(books[0].id).toBe("p");expect(books[0].pages.map(page=>page.page)).toEqual([209]);
  } finally {fixture.pagesByBook={};}
});


it("uses a clearly visible new chapter heading before inherited chapter metadata", async () => {
  fixture.pages=[{page_number:100,text:encodeReferenceVisuals("Current Electricity\nOhm law",[],{chapter:"Moving Charges and Magnetism",match_text:"Current Electricity\nOhm law"})}];
  const books=await loadManualBookLinks({data:{klass:"12",subject:"Physics",chapter:"Moving Charges and Magnetism",topic:"Ohm"}});
  expect(books[0].pages).toEqual([]);
});

it('opens the supplied edition at its chapter start without scanning saved pages or chunks',async()=>{
 fixture.bookName='PHYSICS MED EASY 2.0 FULL PDF BY TEAM KOHINOOR.pdf';fixture.queries=[];
 try{
  const books=await loadManualBookLinks({data:{klass:'12',subject:'Physics',chapter:'Magnetism and Matter',topic:'Bar Magnets'}});
  const known=books.find(book=>book.name===fixture.bookName)!;
  expect(known.pages).toEqual([{page:244,topic:false}]);
  // The generic duplicate still uses its own index; the supplied edition adds no page queries.
  expect(fixture.queries.filter(table=>table==='ncert_pages')).toHaveLength(1);
 }finally{fixture.bookName='PHYSICS MED EASY.pdf';}
});
