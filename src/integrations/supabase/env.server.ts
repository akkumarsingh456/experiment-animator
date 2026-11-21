/**
 * Supabase configuration shared by server-only modules.
 *
 * Lovable's Cloudflare/Nitro worker passes managed secrets as the fetch
 * handler's second argument (env), not necessarily through process.env.
 * src/server.ts forwards those bindings here for server-side consumers.
 * Public VITE_* values remain a build-time fallback for URL/publishable key
 * only. Privileged keys are never read from VITE_*.
 */
import { getSupabaseRuntimeValue } from "./runtime-env.server";

export function getSupabaseServerUrl(): string {
  return getSupabaseRuntimeValue("SUPABASE_URL") ||
    import.meta.env.VITE_SUPABASE_URL || "";
}

export function getSupabaseServerPublishableKey(): string {
  return getSupabaseRuntimeValue("SUPABASE_PUBLISHABLE_KEY") ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
}

export function getSupabaseServerServiceRoleKey(): string {
  return getSupabaseRuntimeValue("SUPABASE_SERVICE_ROLE_KEY");
}
