import {createServerFn} from "@tanstack/react-start";
import {z} from "zod";
import {requireLibraryAdmin} from "@/lib/library-auth";
export const getLibraryAccess=createServerFn({method:"POST"}).handler(async()=>{
 const {readLibraryIdentity}=await import("@/lib/library-access.server");
 const identity=await readLibraryIdentity();
 return identity?{signedIn:true,admin:identity.admin,email:identity.email,name:identity.name}:{signedIn:false,admin:false,email:"",name:""};
});
/** Explicit human review of an existing source; no client can self-approve a book. */
export const approveNcertSource=createServerFn({method:"POST"}).middleware([requireLibraryAdmin])
 .inputValidator((raw:unknown)=>z.object({book_id:z.string().uuid(),confirmed:z.literal(true)}).parse(raw)).handler(async({data,context})=>{
 const {supabaseAdmin:db}=await import("@/integrations/supabase/client.server");
 const {error}=await db.from("ncert_books").update({source_kind:"ncert",approved_by:context.libraryUser.id,approved_at:new Date().toISOString()}).eq("id",data.book_id);
 if(error)throw new Error(error.message);return {approved:true};
});
