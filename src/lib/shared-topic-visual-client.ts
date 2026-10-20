import {loadSharedTopicVisual,saveSharedTopicVisual} from './shared-topic-visual.functions';
import {sharedVisualKey,type SharedVisualScope,type SharedVisualRecord} from './shared-topic-visual';
import type {ManualVisual} from './manual-visuals';
const pending=new Map<string,Promise<SharedVisualRecord|null>>();
export const sharedVisualRecords=new Map<string,SharedVisualRecord|null>();
export function getSharedTopicVisual(scope:SharedVisualScope){
  const key=sharedVisualKey(scope);
  if(sharedVisualRecords.has(key))return Promise.resolve(sharedVisualRecords.get(key)!);
  let request=pending.get(key);
  if(!request){request=loadSharedTopicVisual({data:scope}).then(record=>{if(!sharedVisualRecords.has(key))sharedVisualRecords.set(key,record);return sharedVisualRecords.get(key)!;}).finally(()=>pending.delete(key));pending.set(key,request);}
  return request;
}
export async function preserveTopicVisual(scope:SharedVisualScope,visual:ManualVisual){
  if(visual.url.length>8_000_000)throw new Error('Crop or reduce the image before sharing it (maximum 6 MB).');
  const record=await saveSharedTopicVisual({data:{scope,visual,confirmed:true}});
  const key=sharedVisualKey(scope);sharedVisualRecords.set(key,record);
  window.dispatchEvent(new CustomEvent('shared-topic-visual-saved',{detail:{key}}));
  return record;
}
