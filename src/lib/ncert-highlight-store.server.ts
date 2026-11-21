import {z} from "zod";
import {readLibraryIdentity} from "./library-access.server";

const scopeSchema=z.object({klass:z.string().min(1).max(20),subject:z.string().min(1).max(100),chapter:z.string().min(1).max(500)}).strict();
const rectSchema=z.object({x:z.number().finite().min(-1000).max(20000),y:z.number().finite().min(-1000).max(30000),width:z.number().finite().min(0).max(20000),height:z.number().finite().min(0).max(5000)}).strict();
const markSchema=z.object({text:z.string().min(1).max(5000),color:z.string().regex(/^#[0-9a-fA-F]{6}$/),page:z.number().int().min(1).max(20000),rects:z.array(rectSchema).max(100).optional()}).strict();
export const ncertHighlightPayloadSchema=z.object({scope:scopeSchema,marks:z.array(markSchema).max(500)}).strict();
const BUCKET="teacher-private-workspace";
function isMissing(error:{statusCode?:string|number;status?:number;message?:string}){return Number(error.statusCode||error.status)===404||/not found|does not exist/i.test(error.message||"");}
async function privateStore(create:boolean){
 const user=await readLibraryIdentity();
 if(!user)throw new Error("Sign in to save NCERT highlights to your private workspace.");
 const {supabaseAdmin:db}=await import("@/integrations/supabase/client.server");
 let bucket=await db.storage.getBucket(BUCKET);
 if(bucket.error&&isMissing(bucket.error)&&create){
  const made=await db.storage.createBucket(BUCKET,{public:false,fileSizeLimit:25_000_000,allowedMimeTypes:["application/json"]});
  if(made.error&&!/already exists|duplicate/i.test(made.error.message))throw new Error("Private workspace storage could not be prepared.");
  bucket=await db.storage.getBucket(BUCKET);
 }
 if(bucket.error){if(!create&&isMissing(bucket.error))return {user,bucket:null};throw new Error("Private workspace storage is unavailable.");}
 if(bucket.data?.public!==false)throw new Error("Private workspace storage privacy could not be confirmed. Saving is disabled.");
 return {user,bucket:db.storage.from(BUCKET)};
}
async function storagePath(userId:string,scope:z.infer<typeof scopeSchema>){
 const canonical=JSON.stringify([scope.klass.trim(),scope.subject.trim().toLowerCase(),scope.chapter.trim().toLowerCase()]);
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(canonical));
 const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
 return `${userId}/ncert-highlights/${hash}.json`;
}
export async function loadPrivateNcertHighlights(raw:unknown){
 const {scope}=ncertHighlightPayloadSchema.pick({scope:true}).parse({scope:raw});
 const {user,bucket}=await privateStore(false);if(!bucket)return {marks:[]};
 const result=await bucket.download(await storagePath(user.id,scope));
 if(result.error){if(isMissing(result.error))return {marks:[]};throw new Error("Your private NCERT highlights could not be loaded.");}
 const saved=ncertHighlightPayloadSchema.parse(JSON.parse(await result.data.text()));
 if(JSON.stringify(saved.scope)!==JSON.stringify(scope))throw new Error("Saved NCERT highlight scope did not match.");
 return {marks:saved.marks};
}
export async function savePrivateNcertHighlights(raw:unknown,expectedEmail:string){
 const payload=ncertHighlightPayloadSchema.parse(raw);
 const {user,bucket}=await privateStore(true);
 if(!user.email||user.email.toLowerCase()!==expectedEmail.toLowerCase())throw new Error("Your account changed. Reopen the reader before saving.");
 const path=await storagePath(user.id,payload.scope),body=JSON.stringify(payload);
 if(new TextEncoder().encode(body).length>1_500_000)throw new Error("These highlights exceed the private backup limit. Remove some and retry.");
 const saved=await bucket!.upload(path,new Blob([body],{type:"application/json"}),{upsert:true,contentType:"application/json",cacheControl:"0"});
 if(saved.error)throw new Error("Private cloud saving failed. Your device copy is still available.");
 const confirmed=await bucket!.download(path);
 if(confirmed.error||await confirmed.data.text()!==body)throw new Error("Private cloud saving could not be confirmed. Your device copy is still available.");
 return {saved:true,count:payload.marks.length,updatedAt:new Date().toISOString()};
}
