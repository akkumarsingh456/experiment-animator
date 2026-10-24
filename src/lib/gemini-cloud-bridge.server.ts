/** Cloud project secrets belong to the backend runtime, not necessarily SSR. */
export function hasGeminiCloudBridge(){
 return Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Internal server-to-server call. Never return either credential to the browser. */
export async function cloudGeminiDraft(options:{prompt:string;schema:Record<string,unknown>}):Promise<unknown>{
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)throw new Error('The website Gemini backend connection is unavailable. Ask the site owner to finish setup.');
 const url=new URL('/functions/v1/gemini-topic-chat',base);
 if(url.protocol!=='https:')throw new Error('The Gemini backend requires a secure server connection.');
 let response:Response;
 try{response=await fetch(url,{method:'POST',signal:AbortSignal.timeout(55000),headers:{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${key}`},body:JSON.stringify(options)});}
 catch{throw new Error('The Gemini backend could not be reached. Please retry.');}
 if(!response.ok){
  const body=await response.json().catch(()=>null) as {code?:string}|null;
  if(response.status===404&&body?.code!=='MODEL_UNAVAILABLE')throw new Error('The Gemini backend function has not been deployed yet. Ask the site owner to deploy gemini-topic-chat and publish the website.');
  if(body?.code==='MISSING_GEMINI_KEY')throw new Error('The Gemini backend cannot read GEMINI_API_KEY. Keep the key in this project’s Secrets and publish the backend.');
  if(body?.code==='KEY_REJECTED')throw new Error('Gemini rejected the configured key or project permissions. Check it in Google AI Studio.');
  if(body?.code==='MODEL_UNAVAILABLE')throw new Error('The configured Gemini model is unavailable for this project. Ask the site owner to check the model setting.');
  if(response.status===429)throw new Error('Gemini’s current usage limit has been reached. Wait and retry; no other API key is required.');
  if(response.status===401||response.status===403)throw new Error('The website could not authenticate its Gemini backend connection. Ask the site owner to check the backend deployment.');
  throw new Error('The Gemini backend could not complete this request. Your existing notes are unchanged.');
 }
 const body=await response.json() as {draft?:unknown};
 return body.draft??null;
}
