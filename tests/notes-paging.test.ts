import { describe, expect, it } from "vitest";
import { hasCompleteFormulaDerivations, toNoteBlocks } from "@/lib/notes-paging";

describe("formula derivation grouping", () => {
  const sections = [{
    heading: "Teacher Notes",
    kind: "bullets",
    lines: [
      "**Formula:** $V = IR$",
      "**Formula:** $P = VI$",
      "**Variable:** $V$ is potential difference",
      "**SI unit:** volt ($V$)",
      "**Derivation of Ohm's law:** $V = IR$",
      "**Derivation step 1:** $R = \\frac{V}{I}$",
      "**Derivation step 2:** $V = IR$",
      "**Derivation of power:** $P = VI$",
      "**Derivation step 1:** $P = \\frac{W}{t}$",
      "**Derivation step 2:** $P = VI$",
    ],
  }];

  it("pairs each formula with its derivation even when metadata sits between them", () => {
    const formulaBlocks = toNoteBlocks(sections).filter((block) => /^\*\*Formula/.test(block.lines[0] || ""));
    expect(formulaBlocks).toHaveLength(2);
    expect(formulaBlocks[0]?.lines).toHaveLength(4);
    expect(formulaBlocks[1]?.lines).toHaveLength(4);
    expect(formulaBlocks[0]?.lines.join(" ")).toContain("$V = IR$");
    expect(formulaBlocks[1]?.lines.join(" ")).toContain("$P = VI$");
  });

  it("detects missing derivation steps", () => {
    expect(hasCompleteFormulaDerivations(sections)).toBe(true);
    expect(hasCompleteFormulaDerivations([{ ...sections[0], lines: sections[0].lines.slice(0, 7) }])).toBe(false);
  });
});