import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("lesson build authorization boundaries", () => {
  it("requires verified owner authorization before queue mutations or billable generation", () => {
    const queue = read("src/lib/library-build.functions.ts");
    for (const action of ["enqueueLibrary", "controlBuild", "runBuildBatch"]) {
      const declaration = queue.split(`export const ${action} =`)[1]?.split("\n\n")[0] ?? "";
      expect(declaration, action).toContain(".middleware([requireLibraryBuildAdmin])");
    }
    expect(queue).toContain('import { requireLibraryBuildAdmin } from "@/lib/library-auth";');
  });

  it("keeps public read-only status and completed chapter views available", () => {
    const queue = read("src/lib/library-build.functions.ts");
    for (const action of ["buildStatus", "listBuiltChapters"]) {
      const declaration = queue.split(`export const ${action} =`)[1]?.split("\n\n")[0] ?? "";
      expect(declaration, action).not.toContain("requireLibraryBuildAdmin");
    }
  });

  it("derives build admin status from a verified Supabase user and database allowlist", () => {
    const access = read("src/lib/library-access.server.ts");
    expect(access).toContain("await readLibraryIdentity()");
    expect(access).toContain('request.headers.get("authorization")');
    expect(access).toContain('db.rpc("is_source_library_admin")');
    expect(access).toContain("data !== true");
    expect(access).not.toContain("user_metadata.*admin");
  });

  it("keeps image-generation audit prompts and diagnostics private", () => {
    const migration = read("drizzle/migrations/0006_private_slide_image_audit.sql");
    expect(migration).toContain("REVOKE ALL ON TABLE public.slide_image_audit FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("GRANT ALL ON TABLE public.slide_image_audit TO service_role");
    expect(migration).toContain('DROP POLICY IF EXISTS "audit readable by anyone"');
    expect(migration).toContain('DROP POLICY IF EXISTS "audit insertable by anyone"');
    expect(migration).toContain("slide_image_audit_service_only");
  });

  it("reads Lovable Cloud Supabase secrets from worker bindings before SSR initializes clients", () => {
    const runtime = read("src/integrations/supabase/runtime-env.server.ts");
    const env = read("src/integrations/supabase/env.server.ts");
    const server = read("src/server.ts");
    const admin = read("src/integrations/supabase/client.server.ts");
    const auth = read("src/integrations/supabase/auth-middleware.ts");
    expect(runtime).toContain("setSupabaseRuntimeEnv");
    expect(runtime).toContain("workerBindings[name]");
    expect(env).toContain('getSupabaseRuntimeValue("SUPABASE_URL")');
    expect(env).toContain("import.meta.env.VITE_SUPABASE_URL");
    expect(env).toContain('getSupabaseRuntimeValue("SUPABASE_SERVICE_ROLE_KEY")');
    expect(server).toContain("setSupabaseRuntimeEnv(env)");
    expect(server.indexOf("setSupabaseRuntimeEnv(env)")).toBeLessThan(server.indexOf("handler.fetch(request, env, ctx)"));
    expect(admin).toContain("getSupabaseServerServiceRoleKey()");
    expect(admin).not.toContain("VITE_SUPABASE_SERVICE_ROLE_KEY");
    expect(auth).toContain("getSupabaseServerPublishableKey()");
  });

  it("injects only public Supabase settings into SSR HTML for browser and new-tab clients", () => {
    const server = read("src/server.ts");
    const client = read("src/integrations/supabase/client.ts");
    const config = read("src/integrations/supabase/public-config.ts");
    expect(server).toContain("injectPublicSupabaseConfig");
    expect(server).toContain("window.__EDUPLAN_SUPABASE_CONFIG__");
    expect(server).toContain("getSupabaseServerPublishableKey()");
    expect(server).not.toContain("getSupabaseServerServiceRoleKey()");
    expect(client).toContain("getSupabasePublicConfig()");
    expect(config).toContain("__EDUPLAN_SUPABASE_CONFIG__");
    expect(config).toContain("VITE_SUPABASE_PROJECT_ID");
    expect(config).toContain("VITE_SUPABASE_ANON_KEY");
  });

  it("keeps environment files out of Git and provides only placeholders", () => {
    const ignore = read(".gitignore");
    const example = read(".env.example");
    expect(ignore).toContain(".env");
    expect(ignore).toContain("!.env.example");
    expect(example).toContain("your-supabase-publishable-key");
    expect(example).not.toContain("SUPABASE_SERVICE_ROLE_KEY=ey");
    expect(example).not.toContain("GEMINI_API_KEY=AIza");
  });

  it("does not re-enable source-library writes", () => {
    const access = read("src/lib/library-access.server.ts");
    expect(access).toContain("Uploads, deletion and source changes are disabled for everyone.");
    const migration = read("drizzle/migrations/0005_freeze_source_library.sql");
    expect(migration).toContain("REVOKE INSERT, UPDATE, DELETE, TRUNCATE");
    expect(migration).toContain("source_library_frozen");
  });
});
