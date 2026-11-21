import { setSupabaseRuntimeEnv } from "./integrations/supabase/runtime-env.server";
import { getSupabaseServerUrl, getSupabaseServerPublishableKey } from "./integrations/supabase/env.server";
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

/**
 * Expose only the public Supabase URL and publishable key to the browser.
 * Some Lovable deployments supply these values only as worker bindings.
 * Never serialize the service-role key or any other server secret.
 */
async function injectPublicSupabaseConfig(response: Response): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") || response.status >= 400) return response;

  const url = getSupabaseServerUrl();
  const publishableKey = getSupabaseServerPublishableKey();
  if (!url || !publishableKey) return response;

  const config = JSON.stringify({ url, publishableKey }).replace(/</g, "\\u003c");
  const script = '<script>window.__EDUPLAN_SUPABASE_CONFIG__=' + config + ';</script>';
  const html = await response.text();
  const injected = /<\\/head>/i.test(html)
    ? html.replace(/<\\/head>/i, script + '</head>')
    : html.replace(/<body[^>]*>/i, (body) => body + script);

  if (injected === html) return new Response(html, response);
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("etag");
  return new Response(injected, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // Lovable Cloud injects managed secrets as worker bindings. Capture them
    // before any SSR route or server function initializes Supabase.
    setSupabaseRuntimeEnv(env);
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return await injectPublicSupabaseConfig(normalized);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
