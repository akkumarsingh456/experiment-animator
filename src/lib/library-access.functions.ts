import {createServerFn} from "@tanstack/react-start";
import {z} from "zod";
import {requireLibraryAdmin} from "@/lib/library-auth";
import {isSourceLibrarySetupError, sourceLibraryError, SOURCE_LIBRARY_SETUP_MESSAGE} from "@/lib/source-library-errors";
export const getLibraryAccess=createServerFn({method:"POST"}).handler(async()=>{
 const {readLibraryIdentity}=await import("@/lib/library-access.server");
 const identity=await readLibraryIdentity();
 return identity?{signedIn:true,admin:identity.admin,email:identity.email,name:identity.name}:{signedIn:false,admin:false,email:"",name:""};
});
/** Check deployment readiness without exposing the source inventory publicly. */
export const getSourceLibraryStatus=createServerFn({method:"POST"}).middleware([requireLibraryAdmin]).handler(async()=>{
 const {supabaseAdmin:db}=await import("@/integrations/supabase/client.server");
 const {error}=await db.from("ncert_books").select("source_kind,approved_by,approved_at").limit(0);
 if(error){
  if(isSourceLibrarySetupError(error))return {ready:false,message:SOURCE_LIBRARY_SETUP_MESSAGE};
  throw sourceLibraryError(error);
 }
 return {ready:true,message:""};
});
/** Explicit human review of an existing source; no client can self-approve a book. */
export const approveNcertSource=createServerFn({method:"POST"}).middleware([requireLibraryAdmin])
 .inputValidator((raw:unknown)=>z.object({book_id:z.string().uuid(),confirmed:z.literal(true)}).parse(raw)).handler(async({data,context})=>{
 const {supabaseAdmin:db}=await import("@/integrations/supabase/client.server");
 const {error}=await db.from("ncert_books").update({source_kind:"ncert",approved_by:context.libraryUser.id,approved_at:new Date().toISOString()}).eq("id",data.book_id);
 if(error)throw sourceLibraryError(error);return {approved:true};
});
