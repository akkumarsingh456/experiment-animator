import {afterEach,describe,expect,it,vi} from 'vitest';
import {reportLovableError} from '@/lib/browser-error-reporting';
afterEach(()=>{delete window.__lovableEvents;vi.restoreAllMocks();});
describe('browser error reporter compatibility after the file rename',()=>{
 it('retains the hosting collector and context contract',()=>{
  const captureException=vi.fn();window.__lovableEvents={captureException};const error=new Error('Example');
  reportLovableError(error,{feature:'lesson-view'});
  expect(captureException).toHaveBeenCalledWith(error,{source:'react_error_boundary',route:window.location.pathname,feature:'lesson-view'},{mechanism:'react_error_boundary',handled:false,severity:'error'});
 });
 it('does not fail when the hosting collector is unavailable',()=>{
  delete window.__lovableEvents;expect(()=>reportLovableError(new Error('Example'))).not.toThrow();
 });
});
