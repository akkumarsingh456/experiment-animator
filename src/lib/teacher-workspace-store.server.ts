import { workspaceMetaSchema, workspaceSnapshotSchema, type WorkspaceMeta, type WorkspaceSnapshot } from './teacher-workspace';
import {z} from 'zod';

const BUCKET='teacher-private-workspace';
const missing=(error:{statusCode?:string|number;status?:number;message?:string})=>Number(error.statusCode||error.status)===404||/not found|does not exist/i.test(error.message||'');
async function context(){
  const {readLibraryIdentity}=await import('./library-access.server');
  const user=await readLibraryIdentity();
  if(!user)throw new Error('Sign in to access your private teaching workspace.');
  z.string().uuid().parse(user.id);
  const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
  return {db,user};
}
async function privateBucket(db:Awaited<ReturnType<typeof context>>['db'],create:boolean){
  let bucket=await db.storage.getBucket(BUCKET);
  if(bucket.error&&missing(bucket.error)&&create){
    const created=await db.storage.createBucket(BUCKET,{public:false,fileSizeLimit:25_000_000,allowedMimeTypes:['application/json']});
    if(created.error&&!/already exists|duplicate/i.test(created.error.message))throw new Error('Private workspace storage could not be prepared. Your local notes are unchanged.');
    bucket=await db.storage.getBucket(BUCKET);
  }
  if(bucket.error){if(!create&&missing(bucket.error))return null;throw new Error('Private workspace storage is unavailable. Your local notes are unchanged.');}
  if(bucket.data?.public!==false)throw new Error('Workspace storage privacy could not be confirmed. Saving is disabled.');
  return db.storage.from(BUCKET);
}
export async function savePrivateLesson(snapshot:WorkspaceSnapshot,id?:string,expectedEmail?:string){
  if(id)z.string().uuid().parse(id);
  const {db,user}=await context();
  if(expectedEmail&&user.email.toLowerCase()!==expectedEmail.toLowerCase())throw new Error('Your account changed. Please save again using your current account.');
  const bucket=(await privateBucket(db,true))!;
  const lessonId=id||crypto.randomUUID(),revision=crypto.randomUUID(),savedAt=new Date().toISOString();
  const meta:WorkspaceMeta={id:lessonId,revision,savedAt,title:snapshot.scope.chapter||snapshot.scope.topic,scope:snapshot.scope,slides:snapshot.lesson.slides.length};
  const content=JSON.stringify(workspaceSnapshotSchema.parse(snapshot));
  if(new TextEncoder().encode(content).length>24_000_000)throw new Error('This backup exceeds 24 MB. Reduce imported image sizes before saving. Your local lesson is unchanged.');
  const bodyPath=`${user.id}/lessons/${lessonId}/${revision}.json`,indexPath=`${user.id}/index/${lessonId}.json`;
  let previous:WorkspaceMeta|null=null;
  if(id){const existing=await bucket.download(indexPath);if(!existing.error&&existing.data)previous=workspaceMetaSchema.parse(JSON.parse(await existing.data.text()));else if(existing.error&&!missing(existing.error))throw new Error('Your previous cloud backup could not be checked. Please retry.');}
  const discard=async(path:string)=>{try{await bucket.remove([path]);}catch{/* A storage cleanup failure must not hide a confirmed backup. */}};
  const upload=await bucket.upload(bodyPath,new Blob([content],{type:'application/json'}),{contentType:'application/json',upsert:false,cacheControl:'0'});
  if(upload.error)throw new Error('Cloud backup failed. Your local lesson is unchanged. Please retry.');
  const read=await bucket.download(bodyPath);
  if(read.error||!read.data||await read.data.text()!==content){await discard(bodyPath);throw new Error('The cloud backup could not be confirmed. Please retry.');}
  const summary=JSON.stringify(meta);
  const indexed=await bucket.upload(indexPath,new Blob([summary],{type:'application/json'}),{contentType:'application/json',upsert:true,cacheControl:'0'});
  if(indexed.error){await discard(bodyPath);throw new Error('The cloud backup could not be listed. Your previous backup is unchanged. Please retry.');}
  const confirmed=await bucket.download(indexPath);
  if(confirmed.error||!confirmed.data||await confirmed.data.text()!==summary)throw new Error('The workspace listing could not be confirmed. Please refresh My teaching workspace.');
  // Replace this account's older backup only after the new body and index are confirmed.
  if(previous&&previous.id===lessonId&&previous.revision!==revision)await discard(`${user.id}/lessons/${lessonId}/${previous.revision}.json`);
  return meta;
}
export async function listPrivateLessons(offset:number){
  const {db,user}=await context();const bucket=await privateBucket(db,false);
  if(!bucket)return {items:[] as WorkspaceMeta[],nextOffset:null as number|null};
  const listed=await bucket.list(`${user.id}/index`,{limit:20,offset,sortBy:{column:'updated_at',order:'desc'}});
  if(listed.error)throw new Error('Your saved lessons could not be loaded. Please retry.');
  const items=await Promise.all(listed.data.map(async file=>{
    const value=await bucket.download(`${user.id}/index/${file.name}`);
    if(value.error||!value.data)throw new Error('A saved lesson listing could not be read. Please refresh.');
    const parsed=workspaceMetaSchema.parse(JSON.parse(await value.data.text()));
    if(file.name!==`${parsed.id}.json`)throw new Error('A saved lesson listing needs review.');
    return parsed;
  }));
  return {items,nextOffset:listed.data.length===20?offset+20:null};
}
export async function loadPrivateLesson(id:string){
  z.string().uuid().parse(id);
  const {db,user}=await context();const bucket=await privateBucket(db,false);
  if(!bucket)throw new Error('This lesson was not found in your workspace.');
  const index=await bucket.download(`${user.id}/index/${id}.json`);
  if(index.error||!index.data)throw new Error('This lesson was not found in your workspace.');
  const meta=workspaceMetaSchema.parse(JSON.parse(await index.data.text()));
  if(meta.id!==id)throw new Error('The saved lesson identity could not be confirmed.');
  const body=await bucket.download(`${user.id}/lessons/${id}/${meta.revision}.json`);
  if(body.error||!body.data)throw new Error('This saved lesson could not be opened. Please retry.');
  return {snapshot:workspaceSnapshotSchema.parse(JSON.parse(await body.data.text())),meta,ownerId:user.id};
}
