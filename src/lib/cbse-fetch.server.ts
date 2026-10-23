/** Edge runtimes support manual/follow, but may reject redirect: error. */
export async function fetchCbsePaper(url:string,headers:HeadersInit={}){
 let target=url;
 for(let hop=0;hop<4;hop++){
   const parsed=new URL(target);
   if(parsed.protocol!=='https:'||!['www.cbse.gov.in','cbse.gov.in'].includes(parsed.hostname)||parsed.username||parsed.password||parsed.port)throw new Error('CBSE redirected outside its official paper service.');
   let response:Response;
   try{response=await fetch(parsed.href,{headers,redirect:'manual',signal:AbortSignal.timeout(30000)});}
   catch{throw new Error('The official CBSE paper connection failed. Please retry.');}
   if(response.status<300||response.status>=400)return response;
   const location=response.headers.get('location');await response.body?.cancel();
   if(![301,302,303,307,308].includes(response.status)||!location)throw new Error('CBSE returned an unavailable paper link. Please retry.');
   target=new URL(location,parsed).href;
 }
 throw new Error('CBSE redirected this paper too many times. Please retry later.');
}
