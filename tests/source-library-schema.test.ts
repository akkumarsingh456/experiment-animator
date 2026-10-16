import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isSourceApprovalRequired, isSourceLibrarySetupError, sourceLibraryError, SOURCE_LIBRARY_SETUP_MESSAGE } from "../src/lib/source-library-errors";

describe("source library deployment errors", () => {
  it("distinguishes source approval from schema deployment and transient failures", () => {
    const message="No approved Class 12 Physics NCERT textbook is available. An administrator must verify the correct source in Upload status; material from another class or subject will not be substituted.";
    expect(isSourceApprovalRequired(message)).toBe(true);
    expect(isSourceLibrarySetupError(message)).toBe(false);
    expect(isSourceApprovalRequired("Network request failed")).toBe(false);
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
  it("keeps source approval fail closed while making the migration repeatable", () => {
    const sql=readFileSync("supabase/migrations/20261016010000_lock_source_library.sql","utf8");
    expect(sql).toContain("DEFAULT 'unreviewed'");
    expect(sql).toContain("IF NOT EXISTS (SELECT 1 FROM pg_constraint");
    expect(sql).toContain("DROP POLICY IF EXISTS source_library_no_direct_access");
    expect(sql).toContain("NOTIFY pgrst, 'reload schema'");
    expect(sql).not.toMatch(/UPDATE\s+public\.ncert_books\s+SET\s+source_kind\s*=\s*'ncert'/i);
    expect(sql).not.toMatch(/(?:DELETE\s+FROM|TRUNCATE)\s+(?:public\.)?ncert_(?:books|pages|chunks)/i);
  });
});
