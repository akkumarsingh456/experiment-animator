import { beforeEach, describe, expect, it, vi } from "vitest";
import { indexLocalBookPage } from "@/lib/local-book-index";
import { createLocalBookReader } from "@/lib/local-book-reader";
import { encodeReferenceVisuals, splitReferenceContent } from "@/lib/reference-visuals";

const fixture = vi.hoisted(() => ({ recognize: vi.fn(), terminate: vi.fn(), create: vi.fn(), parameters: vi.fn() }));
vi.mock("tesseract.js", () => ({ createWorker: fixture.create, PSM: { AUTO: "3" } }));
vi.mock("tesseract.js/dist/worker.min.js?url", () => ({ default: "/assets/free-ocr-worker.js" }));

describe("Credit-free browser book reading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixture.create.mockResolvedValue({ recognize: fixture.recognize, terminate: fixture.terminate, setParameters: fixture.parameters });
    fixture.recognize.mockResolvedValue({ data: { text: "Current Electricity\nOhm's Law\nVoltage is proportional to current at a fixed temperature." } });
  });
  it("reads scanned pages locally with one reused worker and releases it on close", async () => {
    const network = vi.spyOn(globalThis, "fetch");
    const reader = createLocalBookReader();
    await reader.recognize("data:image/jpeg;base64,one");
    await reader.recognize("data:image/jpeg;base64,two");
    await reader.close();
    expect(fixture.create).toHaveBeenCalledTimes(1);
    expect(fixture.recognize).toHaveBeenCalledTimes(2);
    expect(fixture.terminate).toHaveBeenCalledTimes(1);
    expect(network).not.toHaveBeenCalled();
    network.mockRestore();
  });
  it("uses the PDF text layer without starting OCR when it is readable", async () => {
    const reader = createLocalBookReader();
    const text = "Current Electricity\nOhm's Law\nVoltage and current have a proportional relationship at constant temperature. The graph passes through the origin.";
    expect(await reader.recognize("data:image/jpeg;base64,page", text)).toBe(text);
    await reader.close();
    expect(fixture.create).not.toHaveBeenCalled();
  });
  it.each([
    ["Physics", "Current Electricity\nOhm's Law\nA graph shows the voltage and current relationship.", "Current Electricity"],
    ["Chemistry", "Haloalkanes and Haloarenes\nNucleophilic substitution reactions and original structures.", "Haloalkanes and Haloarenes"],
    ["Biology", "Human Reproduction\nThe labelled diagram shows the stages in this topic.", "Human Reproduction"],
    ["Chemistry", "Halogens\nChlorine reacts with the compounds in this original reaction map.", "The p-Block Elements"],
    ["Chemistry", "Atomic Structure\nThe original diagram shows the arrangement of electrons.", "Structure of Atom"],
    ["Chemistry", "Thermochemistry\nOriginal definitions of heat, work and enthalpy appear on this page.", "Chemical Thermodynamics"],
  ])("indexes original %s pages by a recognized chapter heading", (subject, text, chapter) => {
    expect(indexLocalBookPage(subject, text)).toMatchObject({ chapter, needsReview: false });
  });
  it("uses a known preceding chapter for continuation pages and clears an unknown new chapter", () => {
    const continuation = "Drift velocity\nElectrons in the conductor experience a force from the applied field.";
    expect(indexLocalBookPage("Physics", continuation, "Chapter 3: Current Electricity").chapter).toBe("Current Electricity");
    expect(indexLocalBookPage("Physics", "Chapter 99: unreadable heading\nA different subject starts here.", "Current Electricity").chapter).toBe("");
    expect(indexLocalBookPage("Physics", continuation).needsReview).toBe(true);
  });
  it("does not attach covers, contents listings or an unreadable page to the preceding chapter", () => {
    expect(indexLocalBookPage("Physics", "Contents\nCurrent Electricity\nElectrostatics\nRay Optics", "Current Electricity").chapter).toBe("");
    expect(indexLocalBookPage("Physics", "", "Current Electricity").needsReview).toBe(true);
  });
  it("preserves free capture and review metadata without treating it as genuine note text", () => {
    const context = { chapter: "", reader: "local" as const, capture_saved: true, needs_review: true, visuals_checked: true };
    const stored = encodeReferenceVisuals("", [], context);
    expect(splitReferenceContent(stored)).toEqual({ text: "", visuals: [], context });
  });
});
