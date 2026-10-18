import { describe, it, expect } from "vitest";
import {
  physicalChemistryRevision,
  withPhysicalChemistryRevision,
  isPhysicalChemistryChapter,
  PHYSICAL_REVISION,
  hasRevisionFormula,
} from "@/lib/physical-chemistry-revision";
import { paginateLectureSections } from "@/lib/lecture-pages";
import type { Slide } from "@/lib/generate.functions";
const slide = (title: string, lines: string[]): Slide => ({
  title,
  visual: "",
  kind: "content",
  bullets: [],
  notes: [],
  key_terms: [],
  sections: [{ heading: "Teacher Notes", kind: "bullets", lines }],
});
const formulas = [
  String.raw`**Formula:** Molarity: $c=\frac{n_{\mathrm{solute}}}{V_{\mathrm{solution}}}$`,
  String.raw`**Formula:** $m=\frac{n}{w}$`,
  String.raw`**Formula:** $p=x p^0$`,
  String.raw`**Formula:** $\Delta T_b=K_b m$`,
];
describe("Physical Chemistry final revision from existing slides only", () => {
  it.each([
    "Some Basic Concepts of Chemistry",
    "Structure of Atom",
    "States of Matter",
    "Chemical Thermodynamics",
    "Equilibrium",
    "Redox Reactions",
    "The Solid State",
    "Solutions",
    "Electrochemistry",
    "Chemical Kinetics",
    "Surface Chemistry",
  ])("recognizes %s", (chapter) =>
    expect(isPhysicalChemistryChapter("12", "Chemistry", `Chapter 1: ${chapter}`)).toBe(true),
  );
  it.each([
    ["12", "Chemistry", "Aldehydes, Ketones and Carboxylic Acids"],
    ["11", "Chemistry", "Hydrocarbons"],
    ["12", "Physics", "Thermodynamics"],
    ["10", "Science", "Solutions"],
  ])("does not affect unrelated chapters: %s %s %s", (klass, subject, chapter) =>
    expect(
      physicalChemistryRevision([slide("Topic", formulas)], klass, subject, chapter),
    ).toBeUndefined(),
  );
  it("appends every formula, units and conditions while preserving original slides and sequence", () => {
    const original = [
      slide("Concentration Terms", formulas.slice(0, 2)),
      slide("Vapour Pressure", formulas.slice(2)),
    ];
    original[0].sections![0].lines.push(
      "**Unit:** c is expressed in mol per litre.",
      "**Condition:** Volume refers to the solution.",
      "**Key point:** Molarity changes with temperature.",
    );
    const before = JSON.stringify(original);
    const shown = withPhysicalChemistryRevision(
      original,
      "12",
      "Chemistry",
      "Chapter 1: Solutions",
    );
    expect(shown.slice(0, 2)).toEqual(original);
    expect(shown[0]).toBe(original[0]);
    expect(shown.at(-1)!.visual).toBe(PHYSICAL_REVISION);
    const copied = shown.at(-1)!.sections!.flatMap((section) => section.lines);
    for (const formula of formulas) expect(copied).toContain(formula);
    expect(copied).toContain("**Unit:** c is expressed in mol per litre.");
    expect(copied).toContain("**Condition:** Volume refers to the solution.");
    expect(copied).toContain("**Key point:** Molarity changes with temperature.");
    expect(JSON.stringify(original)).toBe(before);
  });
  it("collects unlabeled equations, algebraic expressions and formula-only sections", () => {
    const original = slide("Topic", [
      "The relation is $PV=nRT$.",
      "Use $e^{-E_a/RT}$ in the stated expression.",
    ]);
    original.notes = ["q = m c ΔT"];
    original.sections!.push({ heading: "Formulas", kind: "formula", lines: ["a/b"] });
    const lines = physicalChemistryRevision(
      [original],
      "11",
      "Chemistry",
      "States of Matter",
    )!.sections!.flatMap((section) => section.lines);
    for (const line of [...original.sections![0].lines, "q = m c ΔT", "a/b"])
      expect(lines).toContain(line);
  });
  it("has no formula-count cap and paginates a large reference without losing entries", () => {
    const lines = Array.from(
      { length: 85 },
      (_, index) =>
        `**Formula:** Relation ${index + 1}: $x_{${index + 1}}=a_{${index + 1}}+b_{${index + 1}}$`,
    );
    const revision = physicalChemistryRevision(
      [slide("Existing relations", lines)],
      "12",
      "Chemistry",
      "Chemical Kinetics",
    )!;
    const pages = paginateLectureSections(revision.sections);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flatMap((page) => page.flatMap((section) => section.lines))).toEqual(lines);
  });
  it("retains source-review status for extracted formulas", () => {
    const source = slide("Original source", []);
    source.sections = [
      {
        heading: "Source review — original extraction",
        kind: "bullets",
        lines: ["The source reports E = q + w."],
      },
    ];
    expect(
      physicalChemistryRevision([source], "11", "Chemistry", "Thermodynamics")!.sections![0]
        .heading,
    ).toContain("Source review — original extraction");
  });
  it("includes correct worked-question context without treating distractors as facts", () => {
    const original = {
      ...slide("Practice", []),
      kind: "mcq" as const,
      mcq: {
        question: "Select the relation for concentration.",
        options: [
          { key: "A", text: "c = n/V" },
          { key: "B", text: "c = V/n" },
        ],
        answer: "A",
        explanation: "Use c = n/V for the stated quantities.",
      },
    } as Slide;
    const lines = physicalChemistryRevision(
      [original],
      "12",
      "Chemistry",
      "Solutions",
    )!.sections!.flatMap((section) => section.lines);
    expect(lines).toContain("c = n/V");
    expect(lines).not.toContain("c = V/n");
  });
  it("does not add a second revision on repeated presentation passes", () => {
    const shown = withPhysicalChemistryRevision(
      [slide("Topic", formulas)],
      "12",
      "Chemistry",
      "Solutions",
    );
    expect(withPhysicalChemistryRevision(shown, "12", "Chemistry", "Solutions")).toBe(shown);
  });
  it("uses only complete existing short notes and avoids activity or caption filler", () => {
    const original = slide("Topic", [
      "**Key point:** First existing point.",
      "**Definition:** Second existing point.",
      "**Key point:** Third existing point.",
      "**Exit ticket:** Write what you learned.",
    ]);
    original.caption = "NCERT-grounded summary for Topic.";
    const copied = physicalChemistryRevision(
      [original],
      "12",
      "Chemistry",
      "Solutions",
    )!.sections!.flatMap((section) => section.lines);
    expect(copied).toEqual([
      "**Key point:** First existing point.",
      "**Definition:** Second existing point.",
    ]);
  });
  it("deduplicates exact reference copies without dropping different conditions", () => {
    const a = formulas[0] + " Valid at the stated volume.",
      b = formulas[0] + " Use the given temperature.";
    const revision = physicalChemistryRevision(
      [slide("Topic", [a, a, b])],
      "12",
      "Chemistry",
      "Solutions",
    )!;
    expect(revision.sections![0].lines).toEqual([a, b]);
  });
  it("recognizes named physical chemistry subjects and does not invent missing formulas", () => {
    expect(
      isPhysicalChemistryChapter("Class 11", "Physical Chemistry", "Custom physical chapter"),
    ).toBe(true);
    expect(hasRevisionFormula("A complete existing key point.")).toBe(false);
    expect(
      physicalChemistryRevision([slide("No notes", [])], "12", "Chemistry", "Solutions"),
    ).toBeUndefined();
  });
  it("includes formula text from key-term definitions as well as note fields", () => {
    const original = slide("Concentration Terms", []);
    original.key_terms = [{ term: "Molarity", meaning: "c = n/V" }];
    expect(
      physicalChemistryRevision([original], "12", "Chemistry", "Solutions")!.sections!.flatMap(
        (section) => section.lines,
      ),
    ).toContain("Molarity: c = n/V");
  });
});
