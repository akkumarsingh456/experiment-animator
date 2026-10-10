import { describe, expect, it } from "vitest";
import { buildLocalSections, dedupeLabelled, mergeToSingleSection } from "@/lib/ncert-teacher-notes";
import { groupNoteLabels } from "@/components/PagedNoteSections";

describe("Teacher notes repetition", () => {
  const definition = "Mobility is defined as the magnitude of drift velocity per unit electric field.";
  it("does not repeat a definition as a term or fake memory trick", () => {
    const sections = buildLocalSections({ title: "Mobility", bullets: [definition], grounding: definition,
      key_terms: [{ term: "Mobility", meaning: definition }] });
    expect(sections[0].lines).toEqual([`**Definition:** ${definition}`]);
  });
  it("removes cross-label and clipped copies without losing different formulas", () => {
    expect(dedupeLabelled([`**Definition:** ${definition}`, `**Key point:** ${definition.slice(0, -12)}`, "**Formula:** $I = V/R$", "**Formula:** $P = VI$"])).toHaveLength(3);
  });
  it("does not classify equation transitions or generic prose as definitions", () => {
    const lines = buildLocalSections({ title: "Current", bullets: ["From the equation, we obtain the current in the conductor.", "The resistor is the component connected between the two terminals."] })[0].lines;
    expect(lines.some((line) => line.startsWith("**Definition:"))).toBe(false);
  });
  it("deduplicates AI sections across headings", () => {
    expect(mergeToSingleSection([{ heading: "Definition", kind: "text", lines: [definition] }, { heading: "Key points", kind: "bullets", lines: [definition] }])[0].lines).toHaveLength(1);
  });
  it("preserves formula restatements needed by derivation blocks", () => {
    const lines = ["**Formula:** $V = IR$", "**Derivation of Ohm's law:** $V = IR$", "**Derivation step 1:** $V = IR$"];
    expect(dedupeLabelled(lines)).toEqual(lines);
  });
  it("shows consecutive repeated labels under one readable heading", () => {
    const grouped = groupNoteLabels([{ heading: "Teacher Notes", kind: "bullets", lines: ["**Key point:** First fact.", "**Key point:** Second fact.", "**Formula:** $V = IR$", "**Derivation of Ohm's law:** $V = IR$", "**Derivation step 1:** Apply the relation."] }]);
    expect(grouped[0]).toMatchObject({ heading: "Key points", lines: ["First fact.", "Second fact."] });
    expect(grouped[1].lines).toHaveLength(3);
  });
});
