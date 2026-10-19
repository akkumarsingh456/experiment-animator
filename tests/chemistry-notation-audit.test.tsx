import { chaptersFor } from "@/lib/ncert-syllabus";
import { isPhysicalChemistryChapter } from "@/lib/physical-chemistry-revision";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MathText } from "@/components/MathText";
import { chemicalTextNotation, chemicalSpeciesLatex } from "@/lib/chemical-notation";
import { normalizeLatex, isValidLatex, splitMath } from "@/lib/latex-notation";
import { polishChemistryPresentation } from "@/lib/chemistry-note-presentation";
import type { Slide } from "@/lib/generate.functions";
import PagedNoteSections from "@/components/PagedNoteSections";
import { GuidedLessonNotes } from "@/components/GuidedLessonNotes";
const slide = (heading: string, lines: string[]): Slide => ({
  title: "Existing topic",
  visual: "",
  kind: "content",
  bullets: [],
  notes: [],
  key_terms: [],
  sections: [{ heading, kind: "bullets", lines }],
});
describe("Organic and Inorganic Chemistry presentation audit", () => {
  it.each([
    ["Fe3+", "Fe^{3+}"],
    ["NH4+", "NH_{4}^{+}"],
    ["SO4^2-", "SO_{4}^{2-}"],
  ])("separates atom counts and charges in %s", (source, expected) =>
    expect(normalizeLatex(source)).toBe(expected),
  );
  it.each([
    "CH3CH2OH",
    "CH3COOH",
    "Ca(OH)2",
    "K4[Fe(CN)6]",
    "[Co(NH3)6]3+",
    "[Cu(NH3)4]2+",
    "SO4^2-",
    "NH4+",
    "Fe3+",
    "Cu2+",
    "H2SO4",
    "C6H5NH2",
    "2H2O",
  ])("renders %s without changing the input string", (source) => {
    const original = source;
    const displayed = chemicalTextNotation(source);
    expect(displayed).toContain(String.raw`\ce{`);
    for (const part of splitMath(displayed))
      if (part.type !== "text") expect(isValidLatex(part.value), part.value).toBe(true);
    const html = renderToStaticMarkup(<MathText subject="Chemistry" text={source} />);
    expect(html).toContain("katex");
    expect(html).not.toContain("katex-error");
    expect(source).toBe(original);
  });
  it("renders authored chemical reactions with mhchem and preserves the original LaTeX", () => {
    const source = String.raw`$\ce{CH3Br + OH- -> CH3OH + Br-}$`;
    expect(chemicalTextNotation(source)).toBe(source);
    expect(normalizeLatex(String.raw`\ce{CH3Br + OH- -> CH3OH + Br-}`)).toBe(
      String.raw`\ce{CH3Br + OH- -> CH3OH + Br-}`,
    );
    const html = renderToStaticMarkup(<MathText subject="Chemistry" text={source} />);
    expect(html).not.toContain("katex-error");
    expect(html).toContain("→");
  });
  it("preserves existing reaction direction, coefficients, reagents and conditions", () => {
    const source = "2H2O -> 2H2 + O2; use the stated conditions.";
    const displayed = chemicalTextNotation(source);
    expect(displayed).toContain("->");
    expect(displayed).toContain("use the stated conditions.");
    expect(displayed).toContain(String.raw`\ce{2H2O}`);
    expect(displayed).not.toContain(String.raw`\ce{2H2O-}`);
  });
  it("does not mistake a tight reaction arrow for an ionic minus sign", () => {
    const displayed = chemicalTextNotation("CH3Br->CH3OH");
    expect(displayed).toContain("->");
    expect(displayed).not.toContain(String.raw`\ce{CH3Br-}`);
  });
  it("preserves authored formula commands and ambiguous collapsed notation", () => {
    for (const source of [
      String.raw`$\mathrm{Fe}^{3+}$`,
      "O2-",
      "14C",
      "C14",
      "14 6 C",
      "3d 20",
      "Table 1032",
      "As a result, In this case.",
    ])
      expect(chemicalTextNotation(source)).toBe(source);
    expect(chemicalSpeciesLatex("Qq2")).toBeNull();
  });
  it("formats written orbital occupancies, hybridisation and SN mechanisms", () => {
    const displayed = chemicalTextNotation("3d10 4s1; sp3 and sp3d2; SN1 and SN2.");
    expect(displayed).toContain("$3d^{10}$");
    expect(displayed).toContain("$4s^{1}$");
    expect(displayed).toContain("$sp^{3}d^{2}$");
    expect(displayed).toContain(String.raw`\mathrm{S}_{\mathrm{N}}1`);
  });
  it("does not change other subjects or the stored note strings", () => {
    const text = "C2 represents a labelled circuit component.";
    expect(renderToStaticMarkup(<MathText subject="Physics" text={text} />)).not.toContain("katex");
    const original = slide("Definitions", [
      "**Definition:** An existing explanation.",
      "**Definition:** An existing explanation.",
    ]);
    const before = JSON.stringify(original);
    const shown = polishChemistryPresentation(original, "Chemistry");
    expect(shown.sections![0].lines).toHaveLength(1);
    expect(JSON.stringify(original)).toBe(before);
    expect(polishChemistryPresentation(original, "Physics")).toBe(original);
  });
  it.each([
    "Source review — original extraction",
    "Source table — original extracted entries",
    "Reaction mechanism",
    "Worked examples",
    "Practice and answers",
    "Conditions",
  ])("preserves intentional/source repeats in %s", (heading) => {
    const original = slide(heading, ["Retain this same entry.", "Retain this same entry."]);
    expect(polishChemistryPresentation(original, "Chemistry")).toBe(original);
  });
  it("never deduplicates different contexts, equations, steps or qualifiers", () => {
    const lines = [
      "**Key point:** Existing explanation.",
      "**Key point:** Existing explanation. At low temperature.",
      "**Formula:** $a=b$",
      "**Formula:** $a=b$",
      "**Condition:** Only for this reaction.",
      "**Condition:** Only for this reaction.",
    ];
    const original = slide("Teacher Notes", lines);
    expect(polishChemistryPresentation(original, "Chemistry")).toBe(original);
    const steps = slide("Teacher Notes", ["**Step 1:** Repeat this.", "**Step 1:** Repeat this."]);
    expect(polishChemistryPresentation(steps, "Chemistry")).toBe(steps);
  });
  it("uses the same chemistry notation in both slide notes and guided exports", () => {
    const original = slide("Teacher Notes", [
      "**Definition:** Ca(OH)2 contains a grouped formula.",
      "**Key point:** Fe3+ is the explicitly written ion.",
    ]);
    const notes = renderToStaticMarkup(
      <PagedNoteSections subject="Chemistry" sections={original.sections} />,
    );
    const guided = renderToStaticMarkup(
      <GuidedLessonNotes
        slides={[original]}
        title="Coordination Compounds"
        klass="12"
        subject="Chemistry"
      />,
    );
    for (const html of [notes, guided]) {
      expect(html).toContain("katex");
      expect(html).not.toContain("katex-error");
    }
  });
  const chapters = ["11", "12"].flatMap((klass) =>
    chaptersFor(klass, "Chemistry")
      .filter((item) => !isPhysicalChemistryChapter(klass, "Chemistry", item.chapter))
      .map((item) => ({ klass, chapter: item.chapter })),
  );
  it.each(chapters)(
    "$klass $chapter retains original notes and supports chemistry notation",
    ({ klass, chapter }) => {
      const original = slide("Teacher Notes", [
        "**Key point:** Existing explanation stays unchanged.",
        "**Key point:** Existing explanation stays unchanged.",
        "**Example:** CH3CH2OH and [Co(NH3)6]3+ are written examples.",
      ]);
      const before = JSON.stringify(original);
      const shown = polishChemistryPresentation(original, "Chemistry");
      const html = renderToStaticMarkup(
        <GuidedLessonNotes slides={[shown]} title={chapter} klass={klass} subject="Chemistry" />,
      );
      expect(html).not.toContain("katex-error");
      expect(html).toContain("Existing explanation stays unchanged.");
      expect(JSON.stringify(original)).toBe(before);
    },
  );
 it('can hide a repeated explanation beside reactions without removing either reaction',()=>{
  const explanation='**Key point:** This explanation appears twice.';const reaction='**Reaction:** CH3Br -> CH3OH';
  const shown=polishChemistryPresentation(slide('Teacher Notes',[explanation,explanation,reaction,reaction]),'Chemistry');
  expect(shown.sections![0].lines).toEqual([explanation,reaction,reaction]);
 });

});


describe("Biomolecule notation only", () => {
  it("formats the reported explicit leucine side chain without reconstructing surrounding table text", () => {
    const source = "Leucine × (H 3 C) 2 CH-CH 2 - Leu L Name of the Characteristic feature";
    const result = chemicalTextNotation(source);
    expect(result).toBe(String.raw`Leucine × $\ce{(H3C)2CH-CH2}$ - Leu L Name of the Characteristic feature`);
    expect(renderToStaticMarkup(<MathText subject="Chemistry" text={source} />)).not.toContain("katex-error");
  });
  it("typesets explicit amino groups and inverse-mole units while keeping values and prose", () => {
    const source = "COOH NH 2; activation energy is 6.22 kJ mol −1 and 2.15 kJ mol -1.";
    expect(chemicalTextNotation(source)).toBe(String.raw`COOH $\ce{NH2}$; activation energy is 6.22 $\mathrm{kJ}\,\mathrm{mol}^{-1}$ and 2.15 $\mathrm{kJ}\,\mathrm{mol}^{-1}$.`);
    expect(renderToStaticMarkup(<MathText subject="Chemistry" text={source} />)).not.toContain("katex-error");
  });
  it("keeps prose, page numbers, uncertain table fragments and authored math intact", () => {
    const source = String.raw`2019-20 417 Biomolecules COOH H 2 N H R. Almost all the enzymes are globular proteins. $\ce{NH2}$`;
    expect(chemicalTextNotation(source)).toBe(source);
    expect(chemicalTextNotation("6.22 kJ mol −1")).toBe(chemicalTextNotation(chemicalTextNotation("6.22 kJ mol −1")));
  });
});
