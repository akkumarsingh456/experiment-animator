import {createServerFn} from "@tanstack/react-start";
import {requestBookTitle,requestMessageWithTitle} from "@/lib/book-request-content";
import {z} from "zod";
import type {SupabaseClient} from "@supabase/supabase-js";
import {requireLibraryAdmin} from "@/lib/library-auth";
import {bookRequestError} from './book-request-errors';

export type BookRequest = {id:string; book_title:string|null; requester_name:string; verified_email:string; message:string; status:"new"|"reviewed"; created_at:string};

export const submitBookRequest = createServerFn({method:"POST"})
 .inputValidator((raw:unknown)=>z.object({name:z.string().trim().min(1).max(120),bookTitle:z.string().trim().min(1).max(200).regex(/^[^\r\n]+$/).optional(),message:z.string().trim().min(10).max(5000)}).parse(raw))
 .handler(async({data})=>{
  const {readLibraryIdentity}=await import("@/lib/library-access.server");
  const identity=await readLibraryIdentity();
  if(!identity)throw new Error("Please sign in with a verified account to submit a request.");
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const db=supabaseAdmin as SupabaseClient;
  const {count,error:countError}=await db.from("book_requests").select("id",{count:"exact",head:true}).eq("user_id",identity.id).gte("created_at",new Date(Date.now()-86400000).toISOString());
  if(countError)throw new Error(bookRequestError(countError,'submit'));
  if((count||0)>=10)throw new Error("You have reached the daily request limit. Please try again tomorrow.");
  const message=data.bookTitle?requestMessageWithTitle(data.bookTitle,data.message):data.message;
  if(message.length>5000)throw new Error("Please shorten your message to leave room for the book title.");
  const {data:saved,error}=await db.from("book_requests").insert({user_id:identity.id,requester_name:data.name,verified_email:identity.email,message}).select("id,created_at").single();
  if(error||!saved)throw new Error(bookRequestError(error,'submit'));
  return {saved:true,id:String(saved.id),createdAt:String(saved.created_at)};
 });

export const listBookRequests = createServerFn({method:"POST"}).middleware([requireLibraryAdmin])
 .inputValidator((raw:unknown)=>z.object({page:z.number().int().min(0).max(100000)}).parse(raw))
 .handler(async({data})=>{
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const db=supabaseAdmin as SupabaseClient;
  const {data:requests,count,error}=await db.from("book_requests").select("id,requester_name,verified_email,message,status,created_at",{count:"exact"}).order("created_at",{ascending:false}).order("id").range(data.page*25,data.page*25+24);
  if(error)throw new Error(bookRequestError(error,'list'));
  return {requests:(requests||[]).map(request=>({...request,book_title:requestBookTitle(request.message)})) as BookRequest[],total:count||0};
 });

export const reviewBookRequest = createServerFn({method:"POST"}).middleware([requireLibraryAdmin])
 .inputValidator((raw:unknown)=>z.object({id:z.string().uuid(),status:z.enum(["new","reviewed"])}).parse(raw))
 .handler(async({data})=>{
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const db=supabaseAdmin as SupabaseClient;
  const {data:updated,error}=await db.from("book_requests").update({status:data.status}).eq("id",data.id).select("id").maybeSingle();
  if(error||!updated)throw new Error(bookRequestError(error,'review'));
  return {saved:true};
 });
