import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {webcrypto} from 'node:crypto';

const mocks=vi.hoisted(()=>({recognize:vi.fn(),close:vi.fn(),destroy:vi.fn(),factory:vi.fn()}));
vi.mock('../src/lib/local-book-reader',()=>({createLocalBookReader:mocks.factory}));
vi.mock('../src/lib/pdf-extract',()=>({loadPdfjs:async()=>({getDocument:()=>({promise:Promise.resolve({numPages:1,getPage:async()=>({getTextContent:async()=>({items:[]}),getViewport:()=>({width:600,height:800}),render:()=>({promise:Promise.resolve()}),cleanup:vi.fn()})}),destroy:mocks.destroy})})}));
import {readPyqPdf} from '../src/lib/cbse-pyq-reader';
const paper={url:'https://www.cbse.gov.in/paper.pdf',klass:'10',subject:'Science',year:2024,exam:'Main'};
const text='1. Explain the following scientific principle with an example and state the reasoning behind your answer.';
beforeEach(()=>{
 vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('fetch',vi.fn(async()=>new Response(new Uint8Array([1,2,3]))));
 vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/jpeg;base64,test');
 mocks.recognize.mockResolvedValue(text);mocks.factory.mockReturnValue({recognize:mocks.recognize,close:mocks.close});
});
afterEach(()=>{vi.restoreAllMocks();vi.clearAllMocks();vi.unstubAllGlobals();});
describe('reusable PYQ OCR session',()=>{
 it('reuses the supplied reader across PDFs instead of restarting it for each set',async()=>{
  const shared={recognize:mocks.recognize,recognizeContents:vi.fn(),close:mocks.close};
  const first=await readPyqPdf(paper,'first.pdf',vi.fn(),()=>false,shared);
  const second=await readPyqPdf(paper,'second.pdf',vi.fn(),()=>false,shared);
  expect(first.questions.length).toBe(1);expect(second.questions.length).toBe(1);expect(mocks.recognize).toHaveBeenCalledTimes(2);expect(mocks.factory).not.toHaveBeenCalled();expect(mocks.close).not.toHaveBeenCalled();expect(mocks.destroy).toHaveBeenCalledTimes(2);
 });
 it('still closes a privately owned reader after a standalone PDF read',async()=>{
  await readPyqPdf(paper,'single.pdf',vi.fn(),()=>false);expect(mocks.factory).toHaveBeenCalledOnce();expect(mocks.close).toHaveBeenCalledOnce();expect(mocks.destroy).toHaveBeenCalledOnce();
 });
 it('resets a failed shared worker so the next PDF can retry cleanly',async()=>{
  mocks.recognize.mockRejectedValueOnce(new Error('OCR failed'));
  const shared={recognize:mocks.recognize,recognizeContents:vi.fn(),close:mocks.close};
  await expect(readPyqPdf(paper,'failed.pdf',vi.fn(),()=>false,shared)).rejects.toThrow('OCR failed');expect(mocks.close).toHaveBeenCalledOnce();expect(mocks.destroy).toHaveBeenCalledOnce();
 });
});
