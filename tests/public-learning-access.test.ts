import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isLessonTextbook, readLessonTextbooks } from "../src/lib/lesson-textbooks";

const textbook = {id:"book-1",class:"Class 12",subject:"Physics",chapter:"NCERT_CLASS_12_PHYSICS_1",file_name:"NCERT_CLASS_12_PHYSICS_1.pdf"};

describe("public learning with restricted source uploads", () => {
  it("uses historical NCERT textbooks without retrospective approval", () => {
    expect(isLessonTextbook(textbook)).toBe(true);
    expect(isLessonTextbook({...textbook,source_kind:"unreviewed"})).toBe(true);
    expect(isLessonTextbook({...textbook,source_kind:"ncert"})).toBe(true);
  });
  it("keeps reference books out of primary note text", () => {
    expect(isLessonTextbook({...textbook,source_kind:"reference"})).toBe(false);
    expect(isLessonTextbook({...textbook,file_name:"Physics_MED_EASY.pdf"})).toBe(false);
    expect(isLessonTextbook({...textbook,file_name:"PW Class 12 mind map.pdf"})).toBe(false);
    expect(isLessonTextbook({...textbook,file_name:"RD_SHARMA_MATHEMATICS.pdf"})).toBe(false);
  });
  function fakeDb(results: unknown[]) {
    const selections: string[] = [];
    return {selections,from: () => ({select: (fields: string) => {
      selections.push(fields);
      return {order: () => ({range: async () => results.shift()})};
    }})};
  }
  it("reads an existing unreviewed textbook without any approval filter", async () => {
    const db=fakeDb([{data:[{...textbook,source_kind:"unreviewed"}],error:null}]);
    expect(await readLessonTextbooks(db)).toHaveLength(1);
    expect(db.selections).toHaveLength(1);
  });
  it("also supports the pre-authentication schema", async () => {
    const db=fakeDb([{data:null,error:{code:"42703",message:"column ncert_books.source_kind does not exist"}},{data:[textbook],error:null}]);
    expect(await readLessonTextbooks(db)).toEqual([textbook]);
    expect(db.selections).toEqual(["id,class,subject,chapter,file_name,source_kind","id,class,subject,chapter,file_name"]);
  });
  it("does not bypass actual permission or connectivity failures", async () => {
    const db=fakeDb([{data:null,error:{code:"42501",message:"permission denied"}}]);
    await expect(readLessonTextbooks(db)).rejects.toThrow("permission denied");
    expect(db.selections).toHaveLength(1);
  });
  it("keeps the existing public lesson and library routes free of sign-in gates", () => {
    const generation=readFileSync("src/lib/generate.functions.ts","utf8");
    expect(generation).not.toContain('.eq("source_kind", "ncert")');
    expect(generation).not.toContain("No approved Class");
    expect(generation).toContain("readLessonTextbooks(s)");
    const history=readFileSync("src/routes/history.tsx","utf8");
    expect(history).not.toContain("LibraryAccessGate");
    expect(history).not.toContain("Verify as NCERT");
    const list=readFileSync("src/lib/library-books.functions.ts","utf8");
    expect(list).not.toContain("requireLibraryAdmin");
    const queue=readFileSync("src/lib/library-build.functions.ts","utf8");
    expect(queue).not.toContain("requireLibraryAdmin");
  });
  it("requires admin identity for upload writes but permits recorded book downloads", () => {
    const source=readFileSync("src/lib/ingest.functions.ts","utf8");
    for (const name of ["createUploadTicket","insertBook","insertPages","insertChunks"])
      expect(source).toContain(`export const ${name} = createServerFn({ method: "POST" }).middleware([requireLibraryAdmin])`);
    const download=source.split("export const signDownload =")[1].split("export const insertBook =")[0];
    expect(download).not.toContain("requireLibraryAdmin");
    expect(download).toContain('.eq("storage_path", data.path)');
    expect(download).toContain("lookupError || !book");
    expect(readFileSync("src/routes/upload.tsx","utf8")).toContain("LibraryAccessGate");
  });
  it("restores read policies without granting client upload or edit privileges", () => {
    const sql=readFileSync("drizzle/migrations/0002_public_library_reading_admin_uploads.sql","utf8");
    expect(sql).toContain("GRANT SELECT ON public.%I TO anon, authenticated");
    expect(sql).toContain("REVOKE ALL ON public.%I FROM anon, authenticated");
    expect(sql).toContain("FOR SELECT TO anon, authenticated USING (true)");
    expect(sql).not.toMatch(/GRANT (?:INSERT|UPDATE|DELETE|ALL).*TO anon/i);
    expect(sql).not.toMatch(/UPDATE\s+public\.ncert_books\s+SET\s+source_kind/i);
  });
});
