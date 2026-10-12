/** Optional images from the model author's free ZeroGPU Space, never paid inference. */
let pausedUntil=0;
const pending=new Map<string,Promise<string|undefined>>();
const recent=new Map<string,string>();
const SPACE='black-forest-labs/FLUX.1-schnell';
const HOST='black-forest-labs-flux-1-schnell.hf.space';

export async function createFreeContextIllustration(subject:string,title:string,terms:string[]=[]):Promise<string|undefined>{
 const token=process.env.HF_IMAGE_TOKEN;
 if(!token || process.env.HF_IMAGES_FREE_ONLY!=='true' || Date.now()<pausedUntil)return;
 if(!/^(physics|chemistry|biology|botany|zoology)$/i.test(subject))return;
 const key=`${subject}:${title}`;
 if(recent.has(key))return recent.get(key);
 if(pending.has(key))return pending.get(key);
 const request=(async()=>{
  let client:import('@gradio/client').Client|undefined;
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   const {Client}=await import('@gradio/client');
   let connectionExpired=false;
   const connection=Client.connect(SPACE,{token:token as `hf_${string}`}).then(value=>{if(connectionExpired)value.close();return value;});
   let connectTimer:ReturnType<typeof setTimeout>|undefined;
   try { client=await Promise.race([connection,new Promise<never>((_,reject)=>{connectTimer=setTimeout(()=>{connectionExpired=true;reject(new Error('Free GPU connection timed out'));},10000);})]); }
   finally {clearTimeout(connectTimer);}
   const prompt=`Clean flat 2D educational context illustration for ${subject}: ${title}. Relevant topics: ${terms.slice(0,6).join(', ')}. White background, clear large equipment or natural structures. No writing, no letters, no numbers, no equations, no watermark. Exact scientific relationships are supplied in a separate labelled diagram.`;
   const job=client.submit('/infer',{prompt,seed:42,randomize_seed:false,width:768,height:512,num_inference_steps:4});
   timer=setTimeout(()=>void job.cancel().catch(()=>{}),25000);
   let data:unknown;
   for await(const event of job){
    if(event.type==='data')data=event.data;
    if(event.type==='status' && event.stage==='error')throw new Error(typeof event.message === 'string' ? event.message : 'Free GPU unavailable');
   }
   const url=Array.isArray(data)?(data[0] as {url?:string})?.url:undefined;
   if(!url || new URL(url).hostname!==HOST)return;
   const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
   if(!response.ok)return;
   const type=response.headers.get('content-type')?.split(';')[0];
   if(!type || !['image/png','image/jpeg','image/webp'].includes(type))return;
   const bytes=new Uint8Array(await response.arrayBuffer());
   if(bytes.length>3_000_000)return;
   const image=`data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
   recent.set(key,image);if(recent.size>24)recent.delete(recent.keys().next().value!);
   return image;
  }catch(error){
   const message=error instanceof Error?error.message:'';
   if(/quota|credit|spend|payment|billing/i.test(message))pausedUntil=Date.now()+24*60*60*1000;
   else if(/429|rate limit/i.test(message))pausedUntil=Date.now()+60_000;
   return undefined;
  }finally{clearTimeout(timer);client?.close();}
 })();
 pending.set(key,request);try{return await request;}finally{pending.delete(key);}
}
