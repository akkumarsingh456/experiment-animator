import { beforeEach, describe, expect, it, vi } from "vitest";
import { gatewayJSON } from "@/lib/structured-response-client";
import { ensureFormulaBlocks, type NoteSection } from "@/lib/ncert-teacher-notes";

vi.mock("@/lib/structured-response-client", () => ({
  gatewayJSON: vi.fn(),
  hasGatewayKey: () => true,
}));

const gateway = vi.mocked(gatewayJSON);
const response = (formula: string) => ({ slides: [{
  index: 0, formula: [formula], basis: [], variables: [], unit: [], derivation: [],
  derivations: [{ formula, steps: ["Use the source definition.", "Substitute the supplied values."] }],
}] });

describe("Formula additions across chapters", () => {
  beforeEach(() => gateway.mockReset());

  it.each([
    ["11", "Physics", "Motion in a Straight Line", "Acceleration", "$a = \\frac{v-u}{t}$"],
    ["12", "Physics", "Electrostatics", "Capacitance", "$C = \\frac{Q}{V}$"],
    ["11", "Chemistry", "Equilibrium", "Equilibrium constant", "$K_c = \\frac{[C]}{[A][B]}$"],
    ["12", "Chemistry", "Electrochemistry", "Cell potential", "$E_{cell} = E_{cathode}-E_{anode}$"],
    ["12", "Chemistry", "Haloalkanes", "Substitution", "$\\mathrm{CH_3Br + OH^- \\rightarrow CH_3OH + Br^-}$"],
  ])("uses matched reference formulas for Class %s %s %s", async (klass, subject, chapter, title, formula) => {
    gateway.mockResolvedValue(response(formula));
    const original = "**Explanation:** Read the supplied chapter conditions.";
    const slides = [{ title, kind: "content", sections: [{ heading: "Teacher Notes", kind: "bullets" as const, lines: [original] }] }];
    const result = await ensureFormulaBlocks(slides, {
      klass, subject, chapter,
      refContext: `[Med Easy] ${title}: ${formula}\n---\n[Med Easy] Wheatstone Bridge: $P/Q = R/S$`,
    });
    expect(gateway).toHaveBeenCalledTimes(1);
    const prompt = gateway.mock.calls[0][0].prompt;
    expect(prompt).toContain(title);
    expect(prompt).not.toContain("Wheatstone Bridge");
    expect(result[0].sections[0].lines.filter((line) => /^\*\*Formula:/.test(line))).toEqual([`**Formula:** ${formula}`]);
    expect(result[0].sections[0].lines).toContain(original);
    expect(slides[0].sections[0].lines).toEqual([original]);
  });

  it("keeps approved equations, derivation steps and later note sections when adding a relation", async () => {
    gateway.mockResolvedValue(response("Resistance: $R = \\frac{V}{I}$"));
    const approved = [
      "**Formula:** Ohm's law: $V = IR$",
      "**Derivation of Ohm's law:** $V = IR$",
      "**Derivation step 1:** Rearrange the terms using the stated conditions.",
      "**Explanation:** This is the approved note wording.",
    ];
    const sections: NoteSection[] = [
      { heading: "Teacher Notes", kind: "bullets", lines: approved },
      { heading: "Conditions", kind: "text", lines: ["Keep the temperature constant."] },
    ];
    const result = await ensureFormulaBlocks([{ title: "Ohm's Law", kind: "content", sections }], {
      klass: "12", subject: "Physics", chapter: "Current Electricity",
    });
    for (const line of approved) expect(result[0].sections?.[0].lines).toContain(line);
    expect(result[0].sections?.[1]).toEqual(sections[1]);
    expect(sections[0].lines).toEqual(approved);
    expect(gateway.mock.calls[0][0].prompt).toContain("Keep the temperature constant.");
  });

  it("does not use an unrelated reference to manufacture a formula for prose", async () => {
    const slides = [{ title: "Conductors", kind: "content", bullets: ["Metals contain mobile electrons."] }];
    const result = await ensureFormulaBlocks(slides, {
      klass: "12", subject: "Physics", chapter: "Current Electricity",
      refContext: "[Med Easy] Wheatstone Bridge: $P/Q = R/S$",
    });
    expect(gateway).not.toHaveBeenCalled();
    expect(result).toBe(slides);
  });
});
