import {beforeEach,describe,it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({read:vi.fn()}));
vi.mock('@/lib/prepare-reference-books',()=>({prepareScannedReferenceBooks:mock.read}));
beforeEach(()=>{vi.resetModules();mock.read.mockReset();});
describe('preparation independent of lesson generation',()=>{
 it('prepares only the selected chapter and reuses a completed chapter job',async()=>{
  mock.read.mockResolvedValue([{book:'Physics Med Easy',pages:7,figures:7,chapters:1}]);
  const module=await import('@/lib/book-preparation');module.initializeBookPreparation();
  const first=module.startChapterPreparation('12','Physics','Electrostatic Potential and Capacitance');
  expect(module.startChapterPreparation('12','Physics','Electrostatic Potential and Capacitance')).toBe(first);
  await first;
  expect(mock.read).toHaveBeenCalledTimes(1);
  expect(mock.read.mock.calls[0][1]).toBe('Physics');
  expect(mock.read.mock.calls[0][5]).toBe('Electrostatic Potential and Capacitance');
  expect(mock.read.mock.calls[0][6]).toEqual({medEasyOnly:true,chapterOnly:true});
  await module.startChapterPreparation('12','Physics','Electrostatic Potential and Capacitance');expect(mock.read).toHaveBeenCalledTimes(1);
 });
 it('shares one reading job and prepares all four Med Easy subjects without paid AI',async()=>{
  mock.read.mockImplementation(async()=>[{book:'Med Easy',pages:10,figures:2,chapters:1}]);
  const module=await import('@/lib/book-preparation');
  const first=module.startBookPreparation(),second=module.startBookPreparation();
  expect(first).toBe(second);await first;
  expect(mock.read.mock.calls.map(call=>call[1])).toEqual(['Chemistry','Physics','Biology']);
  expect(mock.read.mock.calls.every(call=>call[6].medEasyOnly)).toBe(true);
  expect(module.bookPreparationSnapshot().busy).toBe(false);
  await module.startBookPreparation();expect(mock.read).toHaveBeenCalledTimes(3);
 });
 it('can pause and resume saved preparation without navigation restarting the reader',async()=>{
  let release:()=>void=()=>{};
  mock.read.mockImplementationOnce(()=>new Promise(resolve=>{release=()=>resolve([]);})).mockResolvedValue([]);
  const module=await import('@/lib/book-preparation');
  const run=module.startBookPreparation();module.pauseBookPreparation();release();await run;
  expect(mock.read).toHaveBeenCalledTimes(1);
  await module.startBookPreparation();expect(mock.read).toHaveBeenCalledTimes(4);
 });
 it('prepares newly uploaded books after a previously complete run',async()=>{
  mock.read.mockResolvedValue([{book:'Med Easy',pages:1,figures:1,chapters:1}]);
  const module=await import('@/lib/book-preparation');await module.startBookPreparation();
  module.invalidateBookPreparation();await module.startBookPreparation();
  expect(mock.read).toHaveBeenCalledTimes(6);
 });
 it('reports preparation failures and clears them on a successful retry',async()=>{
  mock.read.mockResolvedValue([{book:'Med Easy',pages:0,figures:0,chapters:0,error:'Storage unavailable'}]);
  const module=await import('@/lib/book-preparation');await module.startBookPreparation();
  expect(module.bookPreparationSnapshot()).toMatchObject({busy:false,failed:true});
  mock.read.mockResolvedValue([{book:'Med Easy',pages:1,figures:1,chapters:1}]);await module.startBookPreparation();
  expect(module.bookPreparationSnapshot()).toMatchObject({busy:false,failed:false});
 });
});
