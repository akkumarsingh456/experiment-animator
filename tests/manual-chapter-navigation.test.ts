import { describe, it, expect, vi } from "vitest";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { findManualChapterPage } from "@/lib/manual-chapter-navigation";
const chapter = "Chapter 4: Moving Charges and Magnetism";
const make = (overrides: Record<string, unknown> = {}) => ({ numPages: 342, getOutline: vi.fn(async () => null),
  getPageLabels: vi.fn(async () => null), getPage: vi.fn(async () => ({ getTextContent: async () => ({ items: [] }) })), ...overrides }) as unknown as PDFDocumentProxy;
describe("Fast chapter navigation with physical-page evidence", () => {
  it("uses a nested exact chapter bookmark and caches it without reading pages", async () => {
    const pdf = make({ getOutline: vi.fn(async () => [{ title: "Class 12", items: [{ title: chapter, dest: "magnetism", items: [] }] }]),
      getDestination: vi.fn(async () => [{ num: 209, gen: 0 }, { name: "XYZ" }]), getPageIndex: vi.fn(async () => 208) });
    expect(await findManualChapterPage(pdf, "Physics", chapter)).toBe(209);
    expect(await findManualChapterPage(pdf, "Physics", chapter)).toBe(209);
    expect(pdf.getOutline).toHaveBeenCalledOnce(); expect(pdf.getPage).not.toHaveBeenCalled();
  });
  it("translates an attested printed range using actual PDF page labels", async () => {
    const pdf = make({ getPageLabels: vi.fn(async () => ["i", "ii", "249", "250", "251", "252"]) });
    expect(await findManualChapterPage(pdf, "Physics", chapter, { start: 251, end: 260 })).toBe(5);
    expect(pdf.getPage).not.toHaveBeenCalled();
  });
  it("verifies native headings instead of guessing an offset from printed numbers", async () => {
    const getPage = vi.fn(async (page: number) => ({ getTextContent: async () => ({ items: [{ str: page === 254 ? "Moving Charges and Magnetism" : "Other material", hasEOL: true }] }) }));
    const pdf = make({ getPage });
    expect(await findManualChapterPage(pdf, "Physics", chapter, { start: 251, end: 260 })).toBe(254);
    expect(getPage.mock.calls.length).toBeLessThan(10);
  });
  it("does not accept a contents listing, another chapter, or silently substitute page one", async () => {
    const pdf = make({ getPage: vi.fn(async () => ({ getTextContent: async () => ({ items: [{ str: "CONTENTS\nMoving Charges and Magnetism 251-260", hasEOL: true }] }) })) });
    expect(await findManualChapterPage(pdf, "Physics", chapter)).toBeNull();
    expect(pdf.getPage).toHaveBeenCalledTimes(16);
  });
  it("stops closed-reader work before making PDF requests", async () => {
    const pdf = make(), controller = new AbortController(); controller.abort();
    await expect(findManualChapterPage(pdf, "Physics", chapter, undefined, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(pdf.getOutline).not.toHaveBeenCalled();
  });
});
