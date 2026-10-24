// Only the trusted website server may call this function. Browser/anon keys are rejected.
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
async function equalSecret(left:string,right:string){
 const encode=new TextEncoder();
 const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',encode.encode(left)),crypto.subtle.digest('SHA-256',encode.encode(right))]);
 const x=new Uint8Array(a),y=new Uint8Array(b);let difference=0;
 for(let i=0;i<x.length;i++)difference|=x[i]^y[i];
 return difference===0;
}
async function bodyText(request:Request){
 const reader=request.body?.getReader();if(!reader)throw new Error('No body');
 let length=0,text='';const decoder=new TextDecoder();
 for(;;){const next=await reader.read();if(next.done)break;length+=next.value.length;if(length>180000){await reader.cancel();throw new Error('Body too large');}text+=decoder.decode(next.value,{stream:true});}
 return text+decoder.decode();
}
let active=0;
Deno.serve(async(request:Request)=>{
 if(request.method!=='POST')return json({code:'METHOD_NOT_ALLOWED'},405);
 const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 const supplied=request.headers.get('apikey')||request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
 if(!serviceKey||!supplied||!await equalSecret(supplied,serviceKey))return json({code:'UNAUTHORIZED'},401);
 if(active>=6)return json({code:'BUSY'},429);
 const key=Deno.env.get('GEMINI_API_KEY')||Deno.env.get('GOOGLE_API_KEY');
 if(!key)return json({code:'MISSING_GEMINI_KEY'},503);
 let input:{prompt?:unknown;schema?:unknown};
 try{input=JSON.parse(await bodyText(request));}catch{return json({code:'INVALID_REQUEST'},400);}
 if(typeof input.prompt!=='string'||input.prompt.length<20||input.prompt.length>110000||!input.schema||typeof input.schema!=='object'||Array.isArray(input.schema)||JSON.stringify(input.schema).length>16000)return json({code:'INVALID_REQUEST'},400);
 const model=Deno.env.get('GEMINI_TOPIC_CHAT_MODEL')||'gemini-3.1-flash-lite';
 if(!/^[a-zA-Z0-9._-]{1,100}$/.test(model))return json({code:'MODEL_UNAVAILABLE'},503);
 active++;
 try{
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',signal:AbortSignal.timeout(45000),headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{role:'user',parts:[{text:input.prompt}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:input.schema,maxOutputTokens:12000}})});
  if(!response.ok){
   await response.body?.cancel();
   return json({code:response.status===401||response.status===403?'KEY_REJECTED':response.status===404?'MODEL_UNAVAILABLE':response.status===429?'QUOTA_LIMIT':'GEMINI_UNAVAILABLE'},response.status===429?429:response.status===401||response.status===403?403:503);
  }
  const result=await response.json();const candidate=result.candidates?.[0];
  if(candidate?.finishReason!=='STOP')return json({code:'INCOMPLETE_REPLY'},502);
  const text=candidate.content?.parts?.filter((part:{thought?:boolean})=>!part.thought).map((part:{text?:string})=>part.text||'').join('')||'';
  try{return json({draft:JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g,''))});}catch{return json({code:'INVALID_REPLY'},502);}
 }catch{return json({code:'GEMINI_UNAVAILABLE'},503);}
 finally{active--;}
});
