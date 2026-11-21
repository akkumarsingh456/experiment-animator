import { describe, expect, it } from "vitest";
import { resolveSupabasePublicConfig } from "../src/integrations/supabase/public-config";

describe("public Supabase configuration", () => {
  it("uses standard Lovable Vite URL and publishable key", () => {
    expect(resolveSupabasePublicConfig({
      VITE_SUPABASE_URL: "https://project-ref.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
    })).toEqual({
      url: "https://project-ref.supabase.co",
      publishableKey: "sb_publishable_example",
    });
  });

  it("accepts server-style URL and anon-key aliases", () => {
    expect(resolveSupabasePublicConfig({}, {
      SUPABASE_URL: "https://project-ref.supabase.co",
      SUPABASE_ANON_KEY: "anon-example",
    })).toEqual({
      url: "https://project-ref.supabase.co",
      publishableKey: "anon-example",
    });
  });

  it("derives the standard Supabase URL from the connected project ref", () => {
    expect(resolveSupabasePublicConfig({
      VITE_SUPABASE_PROJECT_ID: "project-ref",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
    })).toEqual({
      url: "https://project-ref.supabase.co",
      publishableKey: "sb_publishable_example",
    });
  });

  it("uses the public config passed from SSR for separately opened tabs", () => {
    expect(resolveSupabasePublicConfig({}, {
      url: "https://project-ref.supabase.co",
      publishableKey: "sb_publishable_example",
    })).toEqual({
      url: "https://project-ref.supabase.co",
      publishableKey: "sb_publishable_example",
    });
  });
});
