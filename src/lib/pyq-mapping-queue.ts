/** Two requests at a time: reduce network waits without flooding the AI service. */
export async function mapPyqBatches<T,R>(questions:T[],map:(batch:T[])=>Promise<R[]>,stopped:()=>boolean,onProgress:(done:number,total:number)=>void){
 const mappings:R[]=[];let failed=false;
 for(let at=0;at<questions.length;at+=24){
  if(stopped())break;
  const batches=[questions.slice(at,at+12),questions.slice(at+12,at+24)].filter(batch=>batch.length);
  const results=await Promise.allSettled(batches.map(batch=>map(batch)));
  if(stopped())break;
  for(const result of results){if(result.status==='fulfilled')mappings.push(...result.value);else failed=true;}
  onProgress(Math.min(at+24,questions.length),questions.length);
  // Preserve successful suggestions and avoid repeating a failing service call.
  if(failed)break;
 }
 return {mappings,failed};
}
