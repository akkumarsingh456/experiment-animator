/**
 * Shared Supabase endpoint configuration for server-side modules.
 *
 * Lovable/Vite injects VITE_* values at build time for the browser bundle.
 * Some SSR/preview/new-tab runtimes do not expose the equivalent unprefixed
 * variables in process.env, even though the public project endpoint is present
 * in the build environment. The URL and publishable key are public project
 * configuration; privileged keys are deliberately NOT read from VITE_*.
 */
export function getSupabaseServerUrl(): string {
  return process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || "";
}

export function getSupabaseServerPublishableKey(): string {
  return process.env.SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
}
