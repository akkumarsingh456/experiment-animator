/**
 * Resolve only public Supabase configuration for browser and SSR clients.
 * Supports both classic Vite names and Lovable/Supabase server-style names.
 * The project ref is a safe final URL fallback when the URL itself was not
 * injected but the connected project's ID was.
 */
export type SupabaseEnvironment = Record<string, string | undefined>;

function first(...values: Array<string | undefined>): string {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
}

export function resolveSupabasePublicConfig(
  viteEnv: SupabaseEnvironment,
  runtimeEnv: SupabaseEnvironment = {},
): { url: string; publishableKey: string } {
  const projectId = first(
    viteEnv.VITE_SUPABASE_PROJECT_ID,
    viteEnv.SUPABASE_PROJECT_ID,
    runtimeEnv.VITE_SUPABASE_PROJECT_ID,
    runtimeEnv.SUPABASE_PROJECT_ID,
  );

  const url = first(
    viteEnv.VITE_SUPABASE_URL,
    viteEnv.SUPABASE_URL,
    runtimeEnv.SUPABASE_URL,
    runtimeEnv.VITE_SUPABASE_URL,
  ) || (projectId ? `https://${projectId}.supabase.co` : "");

  const publishableKey = first(
    viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
    viteEnv.VITE_SUPABASE_ANON_KEY,
    viteEnv.SUPABASE_PUBLISHABLE_KEY,
    viteEnv.SUPABASE_ANON_KEY,
    runtimeEnv.SUPABASE_PUBLISHABLE_KEY,
    runtimeEnv.SUPABASE_ANON_KEY,
    runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
    runtimeEnv.VITE_SUPABASE_ANON_KEY,
  );

  return { url, publishableKey };
}

export function getSupabasePublicConfig(): { url: string; publishableKey: string } {
  const viteEnv = import.meta.env as unknown as SupabaseEnvironment;
  const processEnv = typeof process !== "undefined"
    ? process.env as SupabaseEnvironment
    : {};
  const browserConfig = typeof window !== "undefined"
    ? (window as Window & { __EDUPLAN_SUPABASE_CONFIG__?: SupabaseEnvironment }).__EDUPLAN_SUPABASE_CONFIG__ ?? {}
    : {};
  return resolveSupabasePublicConfig(viteEnv, { ...processEnv, ...browserConfig });
}
