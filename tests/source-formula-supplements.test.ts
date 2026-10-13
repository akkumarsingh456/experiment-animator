import { describe, expect, it } from "vitest";
import { sourceFormulaLines, SOURCE_FORMULA_RULES } from "@/lib/source-formula-supplements";
import { scopeTextbookPages, referenceFormulaEvidence } from "@/lib/lesson-source-scope";
import { encodeReferenceVisuals } from "@/lib/reference-visuals";
import { splitMath, isValidLatex } from "@/lib/latex-notation";
import { mergeLessonBookPictures, bookPicturesExportNotice } from "@/lib/lesson-book-pictures";
import type { Slide } from "@/lib/generate.functions";

describe("Chapter-wide source formula completeness", () => {
  it("renders every canonical supplemental relation as valid LaTeX", () => {
    for (const entry of SOURCE_FORMULA_RULES) {
      const math = splitMath(entry.formula).filter(part => part.type !== "text");
      expect(math.length, entry.name).toBeGreaterThan(0);
      for (const part of math) expect(isValidLatex(part.value), entry.name).toBe(true);
    }
  });
  it("allows downloads while book captures are pending and explains missing pictures", () => {
    expect(bookPicturesExportNotice(true, 0)).toContain("pictures are still pending");
    expect(bookPicturesExportNotice(true, 2)).toBeUndefined();
    expect(bookPicturesExportNotice(false, 0)).toBeUndefined();
  });
  it.each([
    ["Physics", "Coulomb's Law", "Coulomb's law describes the force between two point charges.", "q_1q_2"],
    ["Physics", "Gauss's Law", "Gauss's law relates the electric flux to the enclosed charge.", "Q_{\\mathrm{enclosed}}"],
    ["Physics", "Universal gravitation", "The gravitation force depends on the two masses and their separation.", "m_1m_2"],
    ["Physics", "Faraday's Law", "Faraday describes the induced electromotive force.", "d\\Phi_B"],
    ["Chemistry", "Mole concept", "The mole is the amount of substance used in stoichiometry.", "N_A"],
    ["Chemistry", "Nernst equation", "Nernst relates the cell potential to the reaction quotient.", "RT"],
    ["Chemistry", "Arrhenius equation", "The Arrhenius equation describes the reaction rate constant.", "E_a"],
    ["Biology", "Hardy Weinberg equilibrium", "Hardy Weinberg describes genetic equilibrium.", "2pq"],
  ])("provides a LaTeX relation for %s / %s when the named source law has lost its glyphs", (subject, title, source, expected) => {
    const lines = sourceFormulaLines(title, subject, [source]);
    expect(lines.join("\n")).toContain(expected);
    for (const line of lines) for (const part of splitMath(line)) if (part.type !== "text") expect(isValidLatex(part.value)).toBe(true);
  });
  it("keeps explicit source formulas for any subject without manufacturing a formula for prose", () => {
    expect(sourceFormulaLines("Elasticity", "Economics", ["Source definition: $E_d=\\frac{\\Delta Q/Q}{\\Delta P/P}$"])[0]).toContain("E_d");
    expect(sourceFormulaLines("Coulomb's Law", "Physics", [])).toEqual([]);
    expect(sourceFormulaLines("Plant Kingdom", "Biology", ["Plants have distinct characteristics."])).toEqual([]);
    const existing = "**Formula:** Ohm’s law: $V=IR$";
    expect(sourceFormulaLines("Ohm's Law", "Physics", ["Ohm's law."], [existing])).toEqual([]);
  });
  it("selects the complete requested NCERT chapter and excludes a different chapter with shared words", () => {
    const pages = [
      {page_number: 1, text: "Contents\nElectric Charges and Fields 1\nCurrent Electricity 83"},
      {page_number: 2, text: "CHAPTER ONE Electric Charges and Fields\nCoulomb's law and its relation."},
      {page_number: 3, text: "Electric ChargesandFields\nGauss's law appears later in the chapter."},
      {page_number: 4, text: "Current Electricity\nThe electric field creates a current in this conductor."},
    ];
    const text = scopeTextbookPages(pages, "Chapter 1: Electric Charges and Fields", ["Electric Charges and Fields", "Current Electricity"]).join(" ");
    expect(text).toContain("Coulomb's law"); expect(text).toContain("Gauss's law"); expect(text).not.toContain("conductor");
  });
  it("also scopes short chapter names such as Atoms and Waves", () => {
    const pages = [{page_number:1,text:"CHAPTER 12 Atoms\nBohr model."},{page_number:2,text:"CHAPTER 13 Nuclei\nMass defect."}];
    expect(scopeTextbookPages(pages,"Chapter 12: Atoms",["Atoms","Nuclei"])).toEqual([pages[0].text]);
    const chemistry = [{page_number:1,text:"Thermodynamics\nFirst law and enthalpy."},{page_number:2,text:"Equilibrium\nReversible reaction."}];
    expect(scopeTextbookPages(chemistry,"Chapter 5: Chemical Thermodynamics",["Chemical Thermodynamics","Equilibrium"])).toEqual([chemistry[0].text]);
  });
  it("passes matching book picture index text to formula generation while excluding another chapter", () => {
    const picture = { title: "Original page", kind: "diagram" as const, description: "Original book", page: 194, chapter: "Electric Charges and Fields", storage_path: "med.pdf.page-194.jpg", aspect: .7, crop: {x:0,y:0,width:1,height:1}, capture: "page" as const, match_text: "Coulomb's law is visible on this original page." };
    const source = encodeReferenceVisuals("", [picture], {chapter: picture.chapter, reader:"local",capture_saved:true});
    expect(referenceFormulaEvidence(source, "Chapter 1: Electric Charges and Fields")).toContain("Coulomb's law");
    expect(referenceFormulaEvidence(source, "Current Electricity")).toBe("");
  });
  it("never changes approved formulas or derivations during picture refresh", () => {
    const slide = { title:"Coulomb's Law", bullets:[], notes:[], key_terms:[], visual:"book", sections:[{heading:"Teacher Notes",kind:"bullets",lines:["Approved explanation.", "**Derivation step 1:** Keep these exact words."]}]} as Slide;
    const formula_lines = sourceFormulaLines(slide.title,"Physics",["Coulomb's law is stated here."]);
    const updated = mergeLessonBookPictures([slide],[{title:slide.title,visuals:[],formula_lines}]);
    const repeated = mergeLessonBookPictures(updated,[{title:slide.title,visuals:[],formula_lines}]);
    expect(repeated[0].sections?.[0].lines).toEqual(slide.sections![0].lines);
    expect(slide.sections![0].lines).toHaveLength(2);
  });
});
