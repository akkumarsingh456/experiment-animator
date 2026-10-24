import {gatewayJSON,hasGatewayKey} from './structured-response-client';

/** Keys stay server-side. Only the missing-topic chat uses these providers. */
export function hasTopicChatProvider(){
 return Boolean(process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||process.env.GROQ_API_KEY||hasGatewayKey());
}
function parseJSON(text:string):unknown{
 try{return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g,''));}catch{return null;}
}
/** One bounded retry for transient failures; never retry bad credentials or long quota waits. */
async function topicRequest(url:string,options:RequestInit):Promise<Response|null>{
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await fetch(url,{...options,signal:AbortSignal.timeout(45000)});
   if(response.ok)return response;
   const transient=[408,429,500,502,503,504].includes(response.status);
   const retryAfter=response.headers.get('retry-after');
   const wait=retryAfter?(Number.isFinite(Number(retryAfter))?Number(retryAfter)*1000:Date.parse(retryAfter)-Date.now()):300;
   await response.body?.cancel();
   if(!transient||attempt||!Number.isFinite(wait)||wait>2000)return null;
   await new Promise(resolve=>setTimeout(resolve,Math.max(0,wait)));
  }catch(error){
   // A timed-out generation already consumed its request budget; move to the next provider.
   if(attempt||(error instanceof Error&&['TimeoutError','AbortError'].includes(error.name)))return null;
   await new Promise(resolve=>setTimeout(resolve,300));
  }
 }
 return null;
}

/** Caller verifies each candidate against source evidence before accepting it. */
export async function* topicChatDrafts(options:{prompt:string;schema:Record<string,unknown>}){
 const geminiKey=process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY;
 if(geminiKey){
  try{
   const model=process.env.GEMINI_TOPIC_CHAT_MODEL||'gemini-3.1-flash-lite';
   if(!/^[a-zA-Z0-9._-]{1,100}$/.test(model))throw new Error('Invalid configured model');
   const response=await topicRequest(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':geminiKey},
    body:JSON.stringify({contents:[{role:'user',parts:[{text:options.prompt}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:options.schema,maxOutputTokens:12000}}),
   });
   if(response?.ok){
    const body=await response.json() as {candidates?:Array<{finishReason?:string;content?:{parts?:Array<{text?:string;thought?:boolean}>}}>};
    const candidate=body.candidates?.[0];
    if(candidate?.finishReason==='STOP'){
     const draft=parseJSON(candidate.content?.parts?.filter(part=>!part.thought).map(part=>part.text||'').join('')||'');
     if(draft)yield {draft,provider:'Gemini'};
    }
   }
  }catch{/* Continue to another configured provider without exposing credentials or raw errors. */}
 }
 if(process.env.GROQ_API_KEY){
  try{
   const response=await topicRequest('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.GROQ_API_KEY}`},
    body:JSON.stringify({model:process.env.GROQ_TOPIC_CHAT_MODEL||'openai/gpt-oss-120b',messages:[{role:'user',content:options.prompt+'\nReturn JSON matching this schema: '+JSON.stringify(options.schema)}],response_format:{type:'json_object'},max_completion_tokens:12000}),
   });
   if(response?.ok){
    const body=await response.json() as {choices?:Array<{finish_reason?:string;message?:{content?:string}}>};
    const choice=body.choices?.[0];
    if(choice?.finish_reason==='stop'){
     const draft=parseJSON(choice.message?.content||'');if(draft)yield {draft,provider:'Groq'};
    }
   }
  }catch{/* Source extraction and teacher drafts remain available. */}
 }
 if(hasGatewayKey()){
  try{
   const draft=await gatewayJSON<unknown>({prompt:options.prompt,schema:options.schema,schemaName:'missing_topic_important_points'});
   if(draft)yield {draft,provider:'Website AI'};
  }catch{/* Return control to the source fallback if the gateway fails. */}
 }
}
