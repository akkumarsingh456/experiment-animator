import {describe,it,expect,vi} from 'vitest';
import {cachedManualPdf,retryManualPdf} from '@/lib/manual-pdf-cache';
const f=vi.hoisted(()=>({get:vi.fn(),destroy:vi.fn(async()=>{})}));
vi.mock('@/lib/pdf-extract',()=>({loadPdfjs:async()=>({getDocument:f.get})}));
describe('reuse opened books',()=>{
 it('shares pending and completed PDF documents and uses larger byte ranges',async()=>{
  f.get.mockImplementation(()=>({promise:Promise.resolve({numPages:342,loadingTask:{destroy:f.destroy}})}));
  const [first,second]=await Promise.all([cachedManualPdf('cached','12','Physics'),cachedManualPdf('cached','12','Physics')]);
  expect(first).toBe(second);expect(await cachedManualPdf('cached','12','Physics')).toBe(first);
  expect(f.get).toHaveBeenCalledOnce();expect(f.get.mock.calls[0][0]).toMatchObject({rangeChunkSize:1048576,disableAutoFetch:true});
  retryManualPdf('cached','12','Physics');await cachedManualPdf('cached','12','Physics');expect(f.get).toHaveBeenCalledTimes(2);
 });
});
