import {describe,expect,it,vi} from 'vitest';
import {mapPyqBatches} from '../src/lib/pyq-mapping-queue';

describe('bounded PYQ classification queue',()=>{
 it('runs two batches together, covers every question once and preserves order',async()=>{
  const questions=Array.from({length:53},(_,i)=>i);let active=0,peak=0;const sizes:number[]=[];
  const result=await mapPyqBatches(questions,async batch=>{sizes.push(batch.length);active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,1));active--;return batch;},()=>false,vi.fn());
  expect(peak).toBe(2);expect(sizes).toEqual([12,12,12,12,5]);expect(result.mappings).toEqual(questions);expect(result.failed).toBe(false);
 });
 it('does not schedule another pair after cancellation',async()=>{
  let stopped=false;const map=vi.fn(async(batch:number[])=>{stopped=true;return batch;});
  const result=await mapPyqBatches(Array.from({length:50},(_,i)=>i),map,()=>stopped,vi.fn());
  expect(map).toHaveBeenCalledTimes(2);expect(result.mappings).toEqual([]);
 });
 it('keeps successful results if a paired request fails, without flooding retries',async()=>{
  let calls=0;const result=await mapPyqBatches(Array.from({length:50},(_,i)=>i),async batch=>{if(++calls===2)throw new Error('Unavailable');return batch;},()=>false,vi.fn());
  expect(calls).toBe(2);expect(result.failed).toBe(true);expect(result.mappings).toEqual(Array.from({length:12},(_,i)=>i));
 });
 it('does not call the service for an empty or already stopped queue',async()=>{
  const map=vi.fn(async(batch:number[])=>batch);await mapPyqBatches([],map,()=>false,vi.fn());await mapPyqBatches([1],map,()=>true,vi.fn());expect(map).not.toHaveBeenCalled();
 });
});
