import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {sharedVisualKey} from './shared-topic-visual';

const field=z.string().trim().min(1).max(500);
const scopeSchema=z.object({klass:field,subject:field,chapter:field,topic:field,slideId:z.string().trim().min(1).max(80)}).strict();
const credit=z.object({title:z.string().max(2000),author:z.string().max(2000),license:z.string().max(2000),page:z.string().url().regex(/^https?:\/\//).max(2000),licenseUrl:z.string().url().regex(/^https?:\/\//).max(2000)});
const visualSchema=z.object({url:z.string().max(8_000_000).regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/),width:z.number().min(10).max(100),x:z.number().min(0).max(90),y:z.number().min(0).max(85),shape:z.enum(['rectangle','rounded','circle']),showAuto:z.boolean(),credit:credit.optional()}).refine(v=>v.x+v.width<=100.01,'The image must fit inside the slide.');
const BUCKET='shared-topic-visuals';
async function objectPath(scope:z.infer<typeof scopeSchema>){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sharedVisualKey(scope)));return `v1/${Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('')}.json`;}
const missing=(error:{message:string;statusCode?:string|number;status?:number})=>Number(error.statusCode||error.status)===404||/not found|does not exist/i.test(error.message);

/** Public reading is separate from all source-book and lesson-generation tables. */
export const loadSharedTopicVisual=createServerFn({method:'POST'}).inputValidator((raw:unknown)=>scopeSchema.parse(raw)).handler(async({data})=>{
  const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
  const {data:file,error}=await db.storage.from(BUCKET).download(await objectPath(data));
  if(error){if(missing(error))return null;throw new Error('Shared images could not be loaded. Your local image is unchanged.');}
  const record=z.object({scope:scopeSchema,visual:visualSchema,savedAt:z.string().datetime()}).parse(JSON.parse(await file.text()));
  if(sharedVisualKey(record.scope)!==sharedVisualKey(data))return null;
  return record;
});

/** Deliberate public contribution: callers must explicitly confirm this exact slide. */
export const saveSharedTopicVisual=createServerFn({method:'POST'}).inputValidator((raw:unknown)=>z.object({scope:scopeSchema,visual:visualSchema,confirmed:z.literal(true)}).parse(raw)).handler(async({data})=>{
  const bytes=Uint8Array.from(atob(data.visual.url.split(',')[1]),char=>char.charCodeAt(0));
  if(bytes.length>6_000_000)throw new Error('Crop or reduce the image before sharing it (maximum 6 MB).');
  const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
  const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if(!(data.visual.url.startsWith('data:image/png;')&&png||data.visual.url.startsWith('data:image/jpeg;')&&jpeg||data.visual.url.startsWith('data:image/webp;')&&webp))throw new Error('Choose a valid PNG, JPG or WebP image.');
  const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
  const {error:bucketError}=await db.storage.getBucket(BUCKET);
  if(bucketError){
    if(!missing(bucketError))throw new Error('Shared image storage is unavailable.');
    const {error}=await db.storage.createBucket(BUCKET,{public:false,fileSizeLimit:9_000_000,allowedMimeTypes:['application/json']});
    if(error&&!/already exists|duplicate/i.test(error.message))throw new Error('Shared image storage could not be prepared.');
  }
  const record={scope:data.scope,visual:data.visual,savedAt:new Date().toISOString()};
  const {error}=await db.storage.from(BUCKET).upload(await objectPath(data.scope),new Blob([JSON.stringify(record)],{type:'application/json'}),{contentType:'application/json',upsert:true,cacheControl:'0'});
  if(error)throw new Error('The image was not saved for everyone. Please try again.');
  return record;
});
