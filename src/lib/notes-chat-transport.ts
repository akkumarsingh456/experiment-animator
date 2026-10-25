/** Retry only interrupted, read-only chat calls; never repeat insertion or saving. */
export async function retryNotesTransport<T>(request:()=>Promise<T>,active:()=>boolean):Promise<T>{
 for(let attempt=0;attempt<2;attempt++){
  if(!active())throw new Error('Notes request cancelled.');
  try{return await request();}
  catch(error){
   const message=error instanceof Error?error.message:'';
   if(attempt||!active()||!/failed to fetch|fetch failed|networkerror|load failed/i.test(message))throw error;
   await new Promise(resolve=>setTimeout(resolve,500));
  }
 }
 throw new Error('The notes connection was interrupted.');
}
