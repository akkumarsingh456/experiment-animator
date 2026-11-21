import { describe, expect, it } from "vitest";
import { isEnglishNcertBookCandidate } from "@/lib/ncert-book-language";

describe("NCERT book language detection", () => {
  it.each([
    "NCERT_CLASS_11_PHYSICS_BHAUTIKI_1.pdf",
    "NCERT_CLASS_11_PHYSICS_BHAUTIKI.pdf",
    "NCERT_CLASS_11_PHYSICS_HINDI.pdf",
    "NCERT_CLASS_11_PHYSICS_भौतिकी.pdf",
    "NCERT_CLASS_11_PHYSICS_VIGYAN.pdf",
    "NCERT_CLASS_11_PHYSICS_BHAG_1.pdf",
  ])("rejects explicitly Hindi-medium book %s", (file_name) => {
    expect(isEnglishNcertBookCandidate({ file_name })).toBe(false);
  });

  it.each([
    "NCERT_CLASS_11_PHYSICS_ENGLISH.pdf",
    "NCERT_CLASS_11_PHYSICS.pdf",
    "NCERT_CLASS_11_PHYSICS_1.pdf",
    "NCERT_CLASS_11_PHYSICS_2.pdf",
    "NCERT Physics Part I.pdf",
  ])("accepts English or neutral book name %s", (file_name) => {
    expect(isEnglishNcertBookCandidate({ file_name })).toBe(true);
  });

  it.each([
    "Oswaal CBSE Chapterwise Mind Maps Science Class 10.pdf",
    "PW Class 10 Science Notes.pdf",
    "Physics Part I.pdf",
    "Class 10 Science.pdf",
  ])("rejects non-NCERT PDF %s even when its subject matches", (file_name) => {
    expect(isEnglishNcertBookCandidate({ file_name })).toBe(false);
  });

  it("accepts a neutral NCERT filename without the word English", () => {
    expect(isEnglishNcertBookCandidate({ file_name: "NCERT_CLASS_10_SCIENCE.pdf" })).toBe(true);
  });

  it("rejects Hindi edition metadata even when the filename is generic", () => {
    expect(isEnglishNcertBookCandidate({ file_name: "NCERT Physics Part I.pdf", chapter: "भौतिकी भाग 1" })).toBe(false);
  });
});
