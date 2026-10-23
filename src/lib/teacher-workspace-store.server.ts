import { workspaceMetaSchema, workspaceSnapshotSchema, type WorkspaceMeta, type WorkspaceSnapshot } from './teacher-workspace';
import {z} from 'zod';
import {teacherPlanRecordSchema,teacherTeachingPlanSchema,type TeacherTeachingPlan,type TeacherPlanRecord} from './teacher-teaching-plan';
import {pyqKey,pyqNoteSchema,type PyqScope} from './cbse-pyq';
import {pyqBankMeta,pyqBankSnapshot,type PyqBankSnapshot} from './saved-pyq-bank';

const BUCKET='teacher-private-workspace';
export async function savePrivatePyqBank(snapshot:PyqBankSnapshot,expectedEmail:string){
 const checked=pyqBankSnapshot.parse(snapshot),{db,user}=await context();if(user.email.toLowerCase()!==expectedEmail.toLowerCase())throw new Error('Your account changed. Please reopen your workspace before saving.');
 const questions=checked.readings.reduce((total,reading)=>total+reading.questions.length,0);if(!questions)throw new Error('Extract some questions before saving a bank.');
 const {cbsePapers,pyqSubjectMatches}=await import('./cbse-pyq');
 for(const reading of checked.readings)if(reading.klass!==checked.scope.klass||!pyqSubjectMatches(reading.subject,checked.scope.subject)||checked.scope.year!=='all'&&reading.year!==Number(checked.scope.year)||!cbsePapers.some(p=>p.url===reading.url&&p.klass===reading.klass&&p.year===reading.year&&pyqSubjectMatches(p.subject,reading.subject)))throw new Error('The question bank contains a different class, subject, year or source.');
 const bucket=(await privateBucket(db,true))!,id=crypto.randomUUID(),savedAt=new Date().toISOString(),meta=pyqBankMeta.parse({id,savedAt,title:checked.scope.chapter||`${checked.scope.subject} question bank`,scope:checked.scope,questions});
 const body=JSON.stringify(checked);if(new TextEncoder().encode(body).length>8_000_000)throw new Error('This bank exceeds 8 MB. Choose a chapter or year and save smaller banks.');
 const path=`${user.id}/question-banks/${id}.json`,index=`${user.id}/question-bank-index/${id}.json`;
 const saved=await bucket.upload(path,new Blob([body],{type:'application/json'}),{upsert:false,contentType:'application/json',cacheControl:'0'});if(saved.error)throw new Error('Question-bank saving failed. Your device questions are unchanged.');
 const confirmed=await bucket.download(path);if(confirmed.error||await confirmed.data.text()!==body)throw new Error('Question-bank saving could not be confirmed. Please retry.');
 const summary=JSON.stringify(meta),listed=await bucket.upload(index,new Blob([summary],{type:'application/json'}),{upsert:false,contentType:'application/json',cacheControl:'0'});if(listed.error)throw new Error('The saved question bank could not be listed. Please retry.');
 const confirmation=await bucket.download(index);if(confirmation.error||await confirmation.data.text()!==summary)throw new Error('The question-bank listing could not be confirmed. Please refresh.');
 return meta;
}
export async function listPrivatePyqBanks(offset:number){
 const {db,user}=await context(),bucket=await privateBucket(db,false);if(!bucket)return {items:[] as Array<import('./saved-pyq-bank').PyqBankMeta>,nextOffset:null as number|null};
 const listed=await bucket.list(`${user.id}/question-bank-index`,{limit:20,offset,sortBy:{column:'updated_at',order:'desc'}});if(listed.error)throw new Error('Saved question banks could not be loaded.');
 const items=await Promise.all(listed.data.map(async file=>{if(!/^[0-9a-f-]{36}\.json$/i.test(file.name))throw new Error('A saved question bank needs review.');const value=await bucket.download(`${user.id}/question-bank-index/${file.name}`);if(value.error)throw new Error('A saved question-bank listing could not be read.');const meta=pyqBankMeta.parse(JSON.parse(await value.data.text()));if(file.name!==`${meta.id}.json`)throw new Error('Question-bank identity could not be confirmed.');return meta;}));
 return {items,nextOffset:listed.data.length===20?offset+20:null};
}
export async function loadPrivatePyqBank(id:string){
 z.string().uuid().parse(id);const {db,user}=await context(),bucket=await privateBucket(db,false);if(!bucket)throw new Error('This question bank was not found in your workspace.');
 const index=await bucket.download(`${user.id}/question-bank-index/${id}.json`);if(index.error)throw new Error('This question bank was not found in your workspace.');
 const meta=pyqBankMeta.parse(JSON.parse(await index.data.text()));if(meta.id!==id)throw new Error('Question-bank identity could not be confirmed.');
 const saved=await bucket.download(`${user.id}/question-banks/${id}.json`);if(saved.error)throw new Error('This saved question bank could not be read.');
 const snapshot=pyqBankSnapshot.parse(JSON.parse(await saved.data.text()));if(JSON.stringify(meta.scope)!==JSON.stringify(snapshot.scope)||meta.questions!==snapshot.readings.reduce((total,reading)=>total+reading.questions.length,0))throw new Error('The saved question bank does not match its listing.');
 return {meta,snapshot};
}
async function pyqPath(userId:string,scope:PyqScope){
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pyqKey(scope)));
 return `${userId}/pyq/${Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('')}.json`;
}
export async function loadPrivatePyqNote(scope:PyqScope){
 const {db,user}=await context(),bucket=await privateBucket(db,false);if(!bucket)return null;
 const saved=await bucket.download(await pyqPath(user.id,scope));
 if(saved.error){if(missing(saved.error))return null;throw new Error('PYQ notes could not be loaded. Keep your device draft and retry.');}
 const record=pyqNoteSchema.parse(JSON.parse(await saved.data.text()));
 if(pyqKey(record.scope)!==pyqKey(scope))throw new Error('PYQ note scope could not be confirmed.');
 return record;
}
export async function savePrivatePyqNote(data:{scope:PyqScope;text:string;expectedRevision:string;expectedEmail:string}){
 const {db,user}=await context();if(user.email.toLowerCase()!==data.expectedEmail.toLowerCase())throw new Error('Your account changed. Reopen your PYQ notes before saving.');
 const bucket=(await privateBucket(db,true))!,path=await pyqPath(user.id,data.scope),previous=await bucket.download(path);
 let revision='';if(!previous.error)revision=pyqNoteSchema.parse(JSON.parse(await previous.data.text())).revision;else if(!missing(previous.error))throw new Error('The cloud notes could not be checked.');
 if(revision!==data.expectedRevision)throw new Error('These PYQ notes changed elsewhere. Reopen this topic and review your draft before saving.');
 const record=pyqNoteSchema.parse({scope:data.scope,text:data.text,revision:crypto.randomUUID(),updatedAt:new Date().toISOString()}),body=JSON.stringify(record);
 const saved=await bucket.upload(path,new Blob([body],{type:'application/json'}),{upsert:true,contentType:'application/json',cacheControl:'0'});if(saved.error)throw new Error('Cloud saving failed. Your device draft is kept.');
 const checked=await bucket.download(path);if(checked.error||await checked.data.text()!==body)throw new Error('Cloud saving could not be confirmed. Keep your draft and reload.');
 return record;
}
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

/** Planning notes are private metadata, independent of lecture content/backups. */
export async function listPrivateTeachingPlans(){
  const {db,user}=await context();const bucket=await privateBucket(db,false);if(!bucket)return [] as TeacherPlanRecord[];
  const records:TeacherPlanRecord[]=[];
  for(let offset=0;;offset+=100){
    const page=await bucket.list(`${user.id}/plans`,{limit:100,offset});
    if(page.error)throw new Error('Your teaching plans could not be loaded. Lecture notes are unchanged.');
    for(let start=0;start<page.data.length;start+=10){
      records.push(...await Promise.all(page.data.slice(start,start+10).map(async file=>{
        if(!/^[0-9a-f-]{36}\.json$/i.test(file.name))throw new Error('A teaching plan needs review.');
        const saved=await bucket.download(`${user.id}/plans/${file.name}`);
        if(saved.error||!saved.data)throw new Error('A teaching plan could not be read. Please refresh.');
        const parsed=teacherPlanRecordSchema.parse(JSON.parse(await saved.data.text()));
        if(file.name!==`${parsed.lessonId}.json`)throw new Error('The teaching plan identity could not be confirmed.');
        return parsed;
      })));
    }
    if(page.data.length<100)break;
  }
  return records;
}
export async function savePrivateTeachingPlan(id:string,plan:TeacherTeachingPlan,expectedRevision:string,expectedEmail:string){
  z.string().uuid().parse(id);const checked=teacherTeachingPlanSchema.parse(plan);
  const {db,user}=await context();
  if(user.email.toLowerCase()!==expectedEmail.toLowerCase())throw new Error('Your account changed. Sign in again before saving this plan.');
  const bucket=await privateBucket(db,false);if(!bucket)throw new Error('Save this lecture to your workspace before adding a teaching plan.');
  const lecture=await bucket.download(`${user.id}/index/${id}.json`);
  if(lecture.error||!lecture.data||workspaceMetaSchema.parse(JSON.parse(await lecture.data.text())).id!==id)throw new Error('This lecture was not found in your workspace.');
  const path=`${user.id}/plans/${id}.json`,previous=await bucket.download(path);
  let revision='';
  if(!previous.error&&previous.data)revision=teacherPlanRecordSchema.parse(JSON.parse(await previous.data.text())).revision;
  else if(previous.error&&!missing(previous.error))throw new Error('The current teaching plan could not be checked. Please retry.');
  if(revision!==expectedRevision)throw new Error('This plan changed on another device. Refresh the workspace, review your device draft and save again.');
  const record:TeacherPlanRecord={lessonId:id,revision:crypto.randomUUID(),updatedAt:new Date().toISOString(),plan:checked},content=JSON.stringify(record);
  const saved=await bucket.upload(path,new Blob([content],{type:'application/json'}),{contentType:'application/json',upsert:true,cacheControl:'0'});
  if(saved.error)throw new Error('Your teaching plan was not saved to the cloud. Keep your draft and retry.');
  const confirmed=await bucket.download(path);
  if(confirmed.error||!confirmed.data||await confirmed.data.text()!==content)throw new Error('Cloud saving could not be confirmed. Refresh before retrying.');
  return record;
}

export async function loadPrivateTeachingPlan(id:string){
 z.string().uuid().parse(id);const {db,user}=await context(),bucket=await privateBucket(db,false);
 if(!bucket)throw new Error('Your private workspace is unavailable. Refresh and retry.');
 const lecture=await bucket.download(`${user.id}/index/${id}.json`);
 if(lecture.error||!lecture.data||workspaceMetaSchema.parse(JSON.parse(await lecture.data.text())).id!==id)throw new Error('This lecture was not found in your private workspace.');
 const response=await bucket.download(`${user.id}/plans/${id}.json`);
 if(response.error){if(missing(response.error))return null;throw new Error('Your teaching plan could not be loaded. Retry before presenting or downloading.');}
 if(!response.data)return null;const record=teacherPlanRecordSchema.parse(JSON.parse(await response.data.text()));
 if(record.lessonId!==id)throw new Error('The teaching plan identity could not be confirmed.');return record;
}
