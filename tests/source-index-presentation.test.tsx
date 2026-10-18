import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  isTextbookIndex,
  readableIndexPresentation,
  sourceIndexEntries,
} from "@/lib/source-index-presentation";
import { SourceIndexReview } from "@/components/SourceIndexReview";
import type { Slide } from "@/lib/generate.functions";
const index =
  "Crystal defects 24 Crystal field splitting 257, 258 Crystal field theory 257 Crystal lattice 9 Crystalline solids 2, 3, 4 Dalton's law 44 Daniell cell 66 Denticity 247 Dependence of rate on concentration 100 Depressants 154 Dialyser 140 Dialysis 140 Diamagnetism 30, 227 Didentate 247 Diode 29 Dislocation defect 25 Dispersed phase 136, 137 Dispersion medium 136, 137 Dissociation constant 263 Distillation 164";
const tail =
  "252 Metal carbonyls 261 Metal excess defect 26 Metallic solids 5 Metallurgy 153, 156 Micelles 138 Minerals 152 Mischmetal 237 Molal elevation constant 51 Molality 39 Molar conductivity 81 Molarity 38, 55 Mole fraction 37, 50 Molecularity of a reaction 103 Mond process 165 Terms Page No.";
const formula = String.raw`**Formula:** Molarity: $c=\frac{n_{\mathrm{solute}}}{V_{\mathrm{solution}}}$`;
const make = (): Slide => ({
  title: "Concentration Terms",
  kind: "content",
  visual: "",
  bullets: [],
  notes: [],
  key_terms: [],
  sections: [
    {
      heading: "Teacher Notes",
      kind: "bullets",
      lines: [index, tail, "Molarity describes amount of solute per solution volume.", formula],
    },
  ],
});
describe("textbook index presentation only", () => {
  it.each([index, tail])("recognizes the reported dense term/page listing", (text) =>
    expect(isTextbookIndex(text)).toBe(true),
  );
  it.each([
    formula,
    "At 298 K, the solution has a concentration of 2 mol per litre.",
    "Find the molarity for 2, 3, 4, 5, 6, 7, 8 and 9 litres of solution.",
    "Dalton’s law is discussed on page 44.",
    "Molarity 38, 55 Mole fraction 37, 50",
    "The table lists pH 1 pH 2 pH 3 pH 4 pH 5 pH 6 pH 7 pH 8.",
  ])("preserves formulas, examples and normal educational prose: %s", (text) =>
    expect(isTextbookIndex(text)).toBe(false),
  );
  it("keeps the formula and explanation in order, with all original input untouched", () => {
    const original = make(),
      before = JSON.stringify(original);
    const shown = readableIndexPresentation(original);
    expect(shown.sections![0].lines).toEqual([
      "Molarity describes amount of solute per solution volume.",
      formula,
    ]);
    expect(sourceIndexEntries(original)).toEqual([index, tail]);
    expect(JSON.stringify(original)).toBe(before);
  });
  it("preserves every source review entry verbatim", () => {
    const original = make();
    original.sections!.push({
      heading: "Source review — original extraction",
      kind: "bullets",
      lines: [index, index],
    });
    const shown = readableIndexPresentation(original);
    expect(shown.sections!.at(-1)!.lines).toEqual([index, index]);
    expect(sourceIndexEntries(original)).toEqual([index, tail]);
  });
  it("retains original PDF and MCQ inputs", () => {
    const original = make();
    for (const variant of [
      { ...original, teacher_pdf: { path: "original.pdf", file_name: "original.pdf", page: 1 } },
      { ...original, kind: "mcq" as const },
    ])
      expect(readableIndexPresentation(variant)).toBe(variant);
  });
  it("retains duplicate source entries in the collapsed reference panel", () => {
    const original = make();
    original.notes = [index, index];
    const html = renderToStaticMarkup(<SourceIndexReview slides={[original]} />);
    expect(sourceIndexEntries(original)).toHaveLength(4);
    expect(html).toContain("Original textbook index entries (4)");
    expect(html).toContain("Crystal defects 24");
    expect(html).toContain("<details");
  });
  it("returns ordinary lessons unchanged", () => {
    const original = make();
    original.sections![0].lines = [formula, "Existing notes are retained."];
    expect(readableIndexPresentation(original)).toBe(original);
    expect(renderToStaticMarkup(<SourceIndexReview slides={[original]} />)).toBe("");
  });
  it("does not relocate data tables or explicitly labelled examples", () => {
    const original = make();
    original.sections = [{ heading: "Measurement data table", kind: "bullets", lines: [index] }];
    expect(readableIndexPresentation(original)).toBe(original);
    expect(isTextbookIndex(`**Example:** ${index}`)).toBe(false);
  });
});
