import {describe,it,expect,vi,afterEach} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {GuidedLessonNotes} from '@/components/GuidedLessonNotes';
import {prepareTeacherPdfPages} from '@/lib/teacher-pdf-pages';
import type {GenerationResult} from '@/lib/generate.functions';
const mocks=vi.hoisted(()=>({sign:vi.fn(),page:vi.fn(),destroy:vi.fn(),render:vi.fn(),cleanup:vi.fn()}));
vi.mock('@/lib/ingest.functions',()=>({signDownload:mocks.sign}));
vi.mock('@/lib/pdf-extract',()=>({loadPdfjs:async()=>({getDocument:()=>({promise:Promise.resolve({getPage:mocks.page}),destroy:mocks.destroy})})}));
const fixture=()=>({slides:[{title:'Power-sharing — original teacher PDF',kind:'content',visual:'book',bullets:[],notes:[],teacher_pdf:{path:'notes.pdf',page:2,file_name:'Power Sharing.pdf'},sections:[{heading:'Book structure and explanation',kind:'text',lines:['Power Sharing.pdf · PDF page 2']}]}]} as GenerationResult);
afterEach(()=>vi.restoreAllMocks());
describe('original uploaded teacher pages in lesson and exports',()=>{
 it('renders the requested PDF page through the public download path',async()=>{
  mocks.sign.mockResolvedValue({signedUrl:'https://example.test/notes.pdf'});
  mocks.page.mockResolvedValue({getViewport:({scale}:{scale:number})=>({width:800*scale,height:1000*scale}),render:()=>({promise:Promise.resolve()}),cleanup:mocks.cleanup});
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({} as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/jpeg;base64,original');
  const input=fixture();const out=await prepareTeacherPdfPages(input);
  expect(mocks.sign).toHaveBeenCalledWith({data:{path:'notes.pdf'}});expect(mocks.page).toHaveBeenCalledWith(2);
  expect(out.slides[0].reference_visuals?.[0]).toMatchObject({url:'data:image/jpeg;base64,original',page:2,aspect:.8});
  expect(input.slides[0].reference_visuals).toBeUndefined();expect(mocks.destroy).toHaveBeenCalled();
 });
 it('uses a dedicated original-page layout without generated practice or an unrelated infographic',()=>{
  const result=fixture();result.slides[0].reference_visuals=[{url:'data:image/jpeg;base64,original',storage_path:'notes.pdf#page=2'}] as any;
  const html=renderToStaticMarkup(<GuidedLessonNotes slides={result.slides} title="Power-sharing" subject="Social Science" klass="10"/>);
  expect(html).toContain('data-teacher-page="true"');expect(html).toContain('src="data:image/jpeg;base64,original"');
  expect(html).not.toContain('Book structure and explanation');expect(html).not.toContain('TopicVisualStructures');
 });
 it('clearly reports an original page that has not loaded',()=>{
  const html=renderToStaticMarkup(<GuidedLessonNotes slides={fixture().slides} title="Power-sharing" subject="Social Science" klass="10"/>);
  expect(html).toContain('role="alert"');expect(html).toContain('Reload the lesson before exporting');
 });
});
