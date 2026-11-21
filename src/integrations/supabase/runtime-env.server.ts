/**
 * Per-deployment runtime bindings supplied to the custom Cloudflare/Nitro
 * worker fetch(request, env, ctx) entry. Lovable Cloud secrets are available
 * here even when process.env is not populated in the worker isolate.
 */
let workerBindings: Record<string, unknown> = {};

export function setSupabaseRuntimeEnv(value: unknown): void {
  if (value && typeof value === "object") {
    workerBindings = value as Record<string, unknown>;
  }
}

function readBinding(name: string): string {
  const value = workerBindings[name];
  return typeof value === "string" ? value.trim() : "";
}

export function getSupabaseRuntimeValue(name: string): string {
  const binding = readBinding(name);
  if (binding) return binding;
  const processValue = typeof process !== "undefined" ? process.env?.[name] : "";
  return typeof processValue === "string" ? processValue.trim() : "";
}
