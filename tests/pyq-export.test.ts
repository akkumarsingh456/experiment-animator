import {afterEach,describe,expect,it,vi} from 'vitest';
import {cbsePapers,isOfficialPyqReading} from '../src/lib/cbse-pyq';
import {presentPyq} from '../src/lib/pyq-presentation';
import type {PyqQuestion,PyqReading} from '../src/lib/cbse-pyq-questions';

const events=vi.hoisted(()=>({saved:vi.fn(),images:vi.fn(),links:vi.fn(),pages:vi.fn(),render:vi.fn()}));
vi.mock('jspdf',()=>({jsPDF:class{addPage=events.pages;addImage=events.images;link=events.links;setFontSize=vi.fn();setTextColor=vi.fn();text=vi.fn();save=events.saved;}}));
vi.mock('html-to-image',()=>({toCanvas:async(root:HTMLElement)=>{events.render(root.textContent);const canvas=document.createElement('canvas');canvas.width=1110;canvas.height=700;return canvas;}}));
vi.mock('../src/lib/export-fonts',()=>({exportFontCss:async()=>''}));
const paper=cbsePapers.find(p=>p.klass==='10'&&p.subject.toLowerCase()==='science')!;
const question:PyqQuestion={id:'check',number:'27',page:16,endPage:16,text:'27. Define the following terms:\n(i) Roasting\n(ii) Alloy\n(iii) Corrosion\nOR\n31(B) 16\n[ ]\n3 1=3\n(i)\n(ii)\n(iii)',ocr:false,chapter:'Metals and Non-metals',topics:[],mapping:'suggested'};
const reading:PyqReading={...paper,file:'Science/paper.pdf',pages:16,ocrPages:0,questions:[question],readAt:new Date().toISOString(),sourceCheckedAt:'2026-10-23',warnings:[]};
afterEach(()=>{vi.restoreAllMocks();vi.clearAllMocks();document.body.replaceChildren();});
describe('CBSE-only question presentation and PDF downloads',()=>{
 it('accepts the exact indexed source and rejects third-party or mismatched metadata',()=>{
  expect(isOfficialPyqReading(reading)).toBe(true);
  for(const changed of [{url:'https://example.com/paper.pdf'},{klass:'12'},{subject:'Unrelated'},{year:2001},{exam:'Invented exam'},{file:'paper.zip'}])expect(isOfficialPyqReading({...reading,...changed})).toBe(false);
 });
 it('hides screenshot footer debris and flags missing alternatives without rewriting stored text',()=>{
  const source=question.text,view=presentPyq(source,'Science');
  expect(view.text).toContain('(iii) Corrosion');expect(view.text).not.toContain('31(B)');expect(view.text.endsWith('OR')).toBe(true);expect(view.warnings.length).toBeGreaterThan(0);expect(question.text).toBe(source);
 });
 it('preserves code, explicit notation and multilingual prose',()=>{
  const code='Write the output:\nif x:\n    print("H2O")\nelse:\n    print(2)';expect(presentPyq(code,'Computer Science').text).toBe(code);
  const symbols='Find x: x² + y² = 25\nH₂O, SO₄²⁻\nप्रश्न का उत्तर दीजिए।';expect(presentPyq(symbols,'Science').text).toBe(symbols);
 });
 it('exports every supplied question, preserves warnings and cleans up its isolated rendering root',async()=>{
  Object.defineProperty(document,'fonts',{configurable:true,value:{ready:Promise.resolve()}});
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({fillStyle:'',fillRect:vi.fn(),drawImage:vi.fn()} as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/jpeg;base64,/9j/');
  vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({left:-10000,top:0,width:740,height:467,right:-9260,bottom:467,x:-10000,y:0,toJSON(){}});
  const {downloadPyqPdf}=await import('../src/lib/pyq-pdf');
  await downloadPyqPdf([{reading,question},{reading,question:{...question,id:'second',number:'28'}}],'CBSE Science',vi.fn());
  expect(events.saved).toHaveBeenCalledWith('CBSE Science.pdf');expect(events.images).toHaveBeenCalledTimes(2);expect(events.pages).toHaveBeenCalledTimes(1);
  expect(events.render.mock.calls[0][0]).toContain('Source review needed');expect(events.render.mock.calls[0][0]).not.toContain('31(B) 16');expect(events.render.mock.calls[1][0]).toContain('Question 28');expect(document.body.children.length).toBe(0);
 });
 it('rejects non-CBSE and empty export selections before creating a download',async()=>{
  const {downloadPyqPdf}=await import('../src/lib/pyq-pdf');
  await expect(downloadPyqPdf([], 'Empty',vi.fn())).rejects.toThrow('No extracted questions');
  await expect(downloadPyqPdf([{reading:{...reading,url:'https://example.com/fake.pdf'},question}],'Fake',vi.fn())).rejects.toThrow('official CBSE catalogue');expect(events.saved).not.toHaveBeenCalled();
 });
});
