import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerUrl, getSupabaseServerPublishableKey } from "@/integrations/supabase/env.server";


/** Identity comes from Auth's verified server response, never browser fields/user_metadata. */
export async function readLibraryIdentity() {
  setResponseHeader("Cache-Control", "private, no-store");
  const request = getRequest();
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new Error("Cross-origin library requests are not permitted.");
  const url = getSupabaseServerUrl();
  const publishableKey = getSupabaseServerPublishableKey();
  if (!url || !publishableKey) throw new Error("Supabase public project configuration is missing. Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the website build settings.");
  const db = createClient(url, publishableKey, {auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error} = await db.auth.getUser(authorization.slice(7));
  if (error || !data.user || !data.user.email || !data.user.email_confirmed_at) return null;
  const email = data.user.email.toLowerCase();
  return {id:data.user.id,email,name:String(data.user.user_metadata?.full_name || data.user.user_metadata?.name || ""),admin:false};
}
/** No browser account may mutate the shared source library, even with an old session. */
export async function assertLibraryAdmin(): Promise<NonNullable<Awaited<ReturnType<typeof readLibraryIdentity>>>> {
  throw new Error("The source library is read-only. Uploads, deletion and source changes are disabled for everyone.");
}

/** Verify build-queue administration using the database's existing owner allowlist.
 * This is separate from source-library writes, which remain permanently disabled.
 */
export async function assertLibraryBuildAdmin(): Promise<NonNullable<Awaited<ReturnType<typeof readLibraryIdentity>>>> {
  const user = await readLibraryIdentity();
  if (!user) throw new Error("Sign in with an authorised site-owner account to manage lesson builds.");
  const request = getRequest();
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("A verified sign-in session is required.");
  const url = getSupabaseServerUrl();
  const key = getSupabaseServerPublishableKey();
  if (!url || !key) throw new Error("Build administration is unavailable until Supabase is configured.");
  const db = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.rpc("is_source_library_admin");
  if (error || data !== true) throw new Error("You do not have permission to manage lesson builds.");
  return user;
}
