import { describe, expect, it } from "vitest";
import { isEnglishNcertBookCandidate } from "@/lib/ncert-book-language";

describe("English NCERT reader book selection", () => {
  it.each([
    "NCERT_CLASS_11_PHYSICS_BHAUTIKI_1.pdf",
    "NCERT_CLASS_11_PHYSICS_BHAUTIKI.pdf",
    "NCERT_CLASS_11_PHYSICS_HINDI.pdf",
    "NCERT_CLASS_11_PHYSICS_भौतिकी.pdf",
    "NCERT_CLASS_11_PHYSICS_VIGYAN.pdf",
    "NCERT_CLASS_11_PHYSICS_BHAG_1.pdf",
  ])("rejects Hindi-medium book %s", (file_name) => {
    expect(isEnglishNcertBookCandidate({ file_name })).toBe(false);
  });

  it.each([
    "NCERT_CLASS_11_PHYSICS_ENGLISH.pdf",
    "NCERT_CLASS_11_PHYSICS.pdf",
    "Physics Part I - English Medium.pdf",
  ])("accepts English or neutral book name %s", (file_name) => {
    expect(isEnglishNcertBookCandidate({ file_name })).toBe(true);
  });

  it("rejects Hindi edition metadata even when the filename is generic", () => {
    expect(isEnglishNcertBookCandidate({ file_name: "NCERT Physics Part I.pdf", chapter: "भौतिकी भाग 1" })).toBe(false);
  });

  it("rejects transliterated Hindi markers separated by underscores and hyphens", () => {
    expect(isEnglishNcertBookCandidate({ file_name: "NCERT_CLASS_11_PHYSICS_BHAUTIKI_1.pdf" })).toBe(false);
    expect(isEnglishNcertBookCandidate({ file_name: "NCERT-Class-11-Physics-Bhautiki-1.pdf" })).toBe(false);
  });
});
