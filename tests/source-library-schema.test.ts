import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isSourceLibrarySetupError, sourceLibraryError, SOURCE_LIBRARY_SETUP_MESSAGE } from "../src/lib/source-library-errors";

describe("source library deployment errors", () => {
  it("never tells public readers to approve historical uploads", () => {
    expect(SOURCE_LIBRARY_SETUP_MESSAGE).toContain("do not require sign-in");
    expect(SOURCE_LIBRARY_SETUP_MESSAGE).not.toContain("verify the matching NCERT");
  });
  it("identifies the reported missing approval column", () => {
    expect(isSourceLibrarySetupError({code:"42703",message:"column ncert_books.source_kind does not exist"})).toBe(true);
    expect(sourceLibraryError({code:"42703",message:"column ncert_books.source_kind does not exist"}).message).toBe(SOURCE_LIBRARY_SETUP_MESSAGE);
  });
  it("also handles PostgREST cache errors for approval metadata", () => {
    expect(isSourceLibrarySetupError({code:"PGRST204",message:"Could not find the 'approved_at' column of 'ncert_books' in the schema cache"})).toBe(true);
    expect(isSourceLibrarySetupError("column ncert_books.approved_by does not exist")).toBe(true);
    expect(isSourceLibrarySetupError(SOURCE_LIBRARY_SETUP_MESSAGE)).toBe(true);
  });
  it("does not hide permission, connectivity or unrelated schema errors", () => {
    for (const error of [
      {code:"42501",message:"permission denied for table ncert_books"},
      {message:"Network request failed"},
      {code:"42703",message:"column ncert_books.chapter does not exist"},
      {message:"source_kind has an invalid value"},
    ]) {
      expect(isSourceLibrarySetupError(error)).toBe(false);
      expect(sourceLibraryError(error).message).toBe(error.message);
    }
    expect(isSourceLibrarySetupError(null)).toBe(false);
  });
  it("keeps the historical migration repeatable without reclassifying books", () => {
    const sql=readFileSync("supabase/migrations/20261016010000_lock_source_library.sql","utf8");
    expect(sql).toContain("DEFAULT 'unreviewed'");
    expect(sql).toContain("IF NOT EXISTS (SELECT 1 FROM pg_constraint");
    expect(sql).toContain("DROP POLICY IF EXISTS source_library_no_direct_access");
    expect(sql).toContain("NOTIFY pgrst, 'reload schema'");
    expect(sql).not.toMatch(/UPDATE\s+public\.ncert_books\s+SET\s+source_kind\s*=\s*'ncert'/i);
    expect(sql).not.toMatch(/(?:DELETE\s+FROM|TRUNCATE)\s+(?:public\.)?ncert_(?:books|pages|chunks)/i);
  });
  it("includes the security repair in the newer active Drizzle migration chain", () => {
    const journal=JSON.parse(readFileSync("drizzle/migrations/meta/_journal.json","utf8"));
    expect(journal.entries.map((entry: {tag: string}) => entry.tag)).toContain("0000_library_basic_profiles_and_source_fields");
    expect(journal.entries.map((entry: {tag: string}) => entry.tag)).toContain("0001_complete_source_library_access");
    const sql=readFileSync("drizzle/migrations/0001_complete_source_library_access.sql","utf8");
    expect(sql).toContain("DEFAULT 'unreviewed'");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.is_source_library_admin()");
    expect(sql).toContain("NOTIFY pgrst, 'reload schema'");
    expect(sql).not.toMatch(/(?:DROP|DELETE FROM|TRUNCATE)\s+(?:TABLE\s+)?(?:public\.)?profiles/i);
  });
});
