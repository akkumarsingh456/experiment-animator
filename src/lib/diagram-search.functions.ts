import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import type {ImageCredit} from './manual-image-import';
import {checkDiagramTopicMatch} from './diagram-relevance';
export type DiagramResult=ImageCredit&{url:string;width:number;height:number;topicMatch:{matched:number;total:number;score:number}};
export type DiagramSearchResult={images:DiagramResult[];filteredCount:number};
const cache=new Map<string,{expires:number;result:DiagramSearchResult}>();
const plain=(value:string)=>value.replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt);/g,' ').replace(/\s+/g,' ').trim().slice(0,220);
function isWikimediaImage(value:string){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&['upload.wikimedia.org','thumb.wikimedia.org'].includes(url.hostname);}catch{return false;}}
export async function fetchCommons(params:URLSearchParams){
  let lastError:unknown;
  for(let attempt=0;attempt<2;attempt++){
    let response:Response;
    try{
      response=await fetch(`https://commons.wikimedia.org/w/api.php?${params}`,{headers:{'User-Agent':'EduPlanAI/1.0 (educational diagram picker; https://notes-ncert.lovable.app/)'},signal:AbortSignal.timeout(12000)});
    }catch(error){
      lastError=error;
      if(attempt===1)break;
      await new Promise(resolve=>setTimeout(resolve,600));
      continue;
    }
    if(response.ok)return response;
    const retryable=response.status===429||response.status>=500;
    const info=`Wikimedia Commons returned ${response.status}${response.statusText?` ${response.statusText}`:''}.`;
    await response.body?.cancel();
    if(!retryable||attempt===1)throw new Error(info);
    const retryAfter=Number(response.headers.get('retry-after'));
    await new Promise(resolve=>setTimeout(resolve,Number.isFinite(retryAfter)&&retryAfter>0?Math.min(retryAfter*1000,2500):600));
  }
  throw new Error(lastError instanceof Error?lastError.message:'Wikimedia Commons is temporarily unreachable. Please retry the preview.');
}
export function commonsSearchParams(query:string){
  return new URLSearchParams({action:'query',format:'json',generator:'search',gsrsearch:`${query.trim()} filetype:drawing -photograph -logo -advertisement`,gsrnamespace:'6',gsrlimit:'20',prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'960'});
}

/** Free public diagram search. Google results are opened separately and never scraped. */
export const searchFreeDiagrams=createServerFn({method:'POST'}).inputValidator((raw:unknown)=>z.object({query:z.string().min(2).max(240)}).parse(raw)).handler(async({data})=>{
  const query=data.query.trim(),key=query.toLowerCase(),saved=cache.get(key);if(saved&&saved.expires>Date.now())return saved.result;
  // Keep the request compact: Wikimedia's full metadata includes large HTML
  // descriptions. Twenty candidates are enough to return twelve licensed matches.
  // Commons search ANDs plain-language terms. Adding class/chapter labels here
  // makes ordinary topics such as "Nutrition" return no results, so keep the
  // provider query topic-focused and use the lesson scope for the visible context.
  const params=commonsSearchParams(query);
  const response=await fetchCommons(params);
  const json=await response.json() as {error?:{info?:string};query?:{pages?:Record<string,{title:string;index?:number;imageinfo?:Array<{thumburl?:string;url:string;descriptionurl:string;mime:string;width:number;height:number;extmetadata?:Record<string,{value:string}>}>}>}};
  if(json.error)throw new Error(json.error.info||'Wikimedia Commons could not complete this search. Please retry.');
  let filteredCount=0;
  const candidates=Object.values(json.query?.pages||{}).flatMap(page=>{
    const topicMatch=checkDiagramTopicMatch(data.query,page.title.replace(/^File:/,''));
    if(!topicMatch.relevant){filteredCount++;return [];}
    const info=page.imageinfo?.[0];if(!info||info.width<100||info.height<80||info.mime!=='image/svg+xml')return [];
    const url=info.thumburl;if(!url||!isWikimediaImage(url))return [];
    const meta=info.extmetadata||{},license=plain(meta.LicenseShortName?.value||'');
    if(!license||!/^https:\/\/commons\.wikimedia\.org\//.test(info.descriptionurl))return [];
    return [{title:plain(page.title.replace(/^File:/,'')),url,page:info.descriptionurl,width:info.width,height:info.height,
      author:plain(meta.Artist?.value||'Wikimedia contributor'),license,licenseUrl:meta.LicenseUrl?.value?.startsWith('https://')?meta.LicenseUrl.value:info.descriptionurl,
      topicMatch:{matched:topicMatch.matched,total:topicMatch.total,score:topicMatch.score},index:page.index||0}];
  });
  const sorted=candidates.sort((a,b)=>b.topicMatch.score-a.topicMatch.score||a.index-b.index),images=sorted.slice(0,12).map(({index:_index,...image})=>image);
  const result={images,filteredCount};
  if(cache.size>=60)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+(images.length?3600000:30000),result});return result;
});

function allowedImageUrl(value:string){
  const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.port)throw new Error('Use Copy image or a screenshot for this website.');
  const host=url.hostname.toLowerCase();
  const allowed=['upload.wikimedia.org','thumb.wikimedia.org','gstatic.com','googleusercontent.com','ncert.nic.in','ncert.gov.in','olabs.edu.in','amrita.edu'];
  if(!allowed.some(domain=>host===domain||host.endsWith(`.${domain}`)))throw new Error('This website does not allow direct image import. Copy the image itself, then paste it here.');return url;
}
/** Restricted image fetch for hosts that expose raster previews, not an open proxy. */
export const importDiagramUrl=createServerFn({method:'POST'}).inputValidator((raw:unknown)=>z.object({url:z.string().url().max(3000)}).parse(raw)).handler(async({data})=>{
  let url=allowedImageUrl(data.url),response:Response|undefined;
  for(let attempt=0;attempt<3;attempt++){
    response=await fetch(url,{redirect:'manual',headers:{'User-Agent':'EduPlanAI/1.0 (educational image import)'},signal:AbortSignal.timeout(15000)});
    if(response.status>=300&&response.status<400){const next=response.headers.get('location');if(!next)break;url=allowedImageUrl(new URL(next,url).href);await response.body?.cancel();continue;}break;
  }
  if(!response?.ok)throw new Error('The image could not be imported. Copy the image itself or paste a screenshot.');
  const type=(response.headers.get('content-type')||'').split(';')[0];if(!/^image\/(png|jpeg|webp)$/.test(type)){await response.body?.cancel();throw new Error('Copy the image itself, rather than the Google result page or image address.');}
  const reader=response.body?.getReader();if(!reader)throw new Error('The image is empty.');const parts:Uint8Array[]=[];let size=0;
  while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>8*1024*1024){await reader.cancel();throw new Error('Choose an image smaller than 8 MB.');}parts.push(chunk.value);}
  let binary='';for(const part of parts)for(let start=0;start<part.length;start+=32768)binary+=String.fromCharCode(...part.subarray(start,start+32768));
  return {dataUrl:`data:${type};base64,${btoa(binary)}`,type};
});
