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

  it("does not re-enable source-library writes", () => {
    const access = read("src/lib/library-access.server.ts");
    expect(access).toContain("Uploads, deletion and source changes are disabled for everyone.");
    const migration = read("drizzle/migrations/0005_freeze_source_library.sql");
    expect(migration).toContain("REVOKE INSERT, UPDATE, DELETE, TRUNCATE");
    expect(migration).toContain("source_library_frozen");
  });
});
