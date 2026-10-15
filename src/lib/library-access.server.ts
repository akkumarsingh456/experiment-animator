import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

const ADMINS = new Set(["akkumarsingh456@gmail.com", "ak25edi00022@student.nitw.ac.in"]);
/** Identity comes from Auth's verified server response, never browser fields/user_metadata. */
export async function readLibraryIdentity() {
  setResponseHeader("Cache-Control", "private, no-store");
  const request = getRequest();
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new Error("Cross-origin library requests are not permitted.");
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error} = await db.auth.getUser(authorization.slice(7));
  if (error || !data.user || !data.user.email || !data.user.email_confirmed_at) return null;
  const email = data.user.email.toLowerCase();
  return {id:data.user.id,email,name:String(data.user.user_metadata?.full_name || data.user.user_metadata?.name || ""),admin:ADMINS.has(email)};
}
export async function assertLibraryAdmin() {
  const identity = await readLibraryIdentity();
  if (!identity?.admin) throw new Error("Access denied. Verified administrator sign-in is required.");
  return identity;
}
