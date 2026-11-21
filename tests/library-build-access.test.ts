import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Library build queue access control", () => {
  it("requires the server-side library admin guard for every queue endpoint", () => {
    const source = readFileSync("src/lib/library-build.functions.ts", "utf8");
    expect(source).toContain('import { requireLibraryAdmin } from "@/lib/library-auth";');
    for (const name of ["enqueueLibrary", "buildStatus", "listBuiltChapters", "controlBuild", "runBuildBatch"]) {
      const declaration = source.split(`export const ${name} =`)[1]?.split("\n\n")[0] || "";
      expect(declaration, name).toContain(".middleware([requireLibraryAdmin])");
    }
  });

  it("keeps the source-library admin guard fail-closed", () => {
    const auth = readFileSync("src/lib/library-access.server.ts", "utf8");
    expect(auth).toContain("throw new Error(\"The source library is read-only.");
  });
});
