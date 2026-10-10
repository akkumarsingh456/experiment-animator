import { describe, expect, it } from "vitest";
import { guidedFormulaRow, guidedGroups } from "@/lib/guided-notes";
import { selectSlideExcerpts, buildLocalSections } from "@/lib/ncert-teacher-notes";
import { renderLessonIllustration } from "@/lib/napkin-infographic";

describe("Complete guided notes", () => {
  it("keeps every distinct source point, including notes beyond the former eight-point limit", () => {
    const bullets = Array.from({ length: 15 }, (_, i) => `The conductor sample ${i} carries charge through its cross-sectional area.`);
    expect(buildLocalSections({ title: "Conductors", bullets })[0].lines).toHaveLength(15);
  });
  it("retains formulas in the summary and keeps derivation steps together", () => {
    const groups = guidedGroups([{ heading: "Teacher Notes", kind: "bullets", lines: ["**Definition:** Current is defined as the rate of charge flow.", "**Formula:** Current | $I = Q/t$ | A", "**Derivation of current:** $I = Q/t$", "**Derivation step 1:** Measure charge $Q$.", "**Derivation step 2:** Divide by time $t$."] }]);
    expect(groups.find((group) => group.kind === "formula")?.lines).toEqual(["Current | $I = Q/t$ | A"]);
    expect(groups.find((group) => group.kind === "derivation")?.lines).toHaveLength(4);
  });
  it("reads supplied formula units without guessing units for legacy equations", () => {
    expect(guidedFormulaRow("Resistance | $R = V/I$ | $\\Omega$").unit).toBe("$\\Omega$");
    expect(guidedFormulaRow("$V = IR$").unit).toBe("—");
  });
  it("does not reuse a consumed derivation for an adjacent different formula", () => {
    const groups = guidedGroups([{ heading: "Teacher Notes", kind: "bullets", lines: ["**Formula:** Current | $I = nAev_d$ | A", "**Formula:** Mobility | $\\mu = v_d/E$ | m²/(V s)", "**Derivation of current:** $I = nAev_d$", "**Derivation step 1:** Divide charge by time."] }]);
    expect(groups.filter((group) => group.kind === "derivation")).toHaveLength(1);
    expect(groups.find((group) => group.kind === "formula")?.lines).toHaveLength(2);
  });
  it("expands topic evidence without pulling in unrelated chapter sentences", () => {
    const excerpts = selectSlideExcerpts({ title: "Electron Mobility", bullets: ["Mobility is defined as drift velocity per unit electric field."] }, "Electron mobility depends on the relaxation time in the material. A balanced Wheatstone bridge carries no galvanometer current.");
    expect(excerpts.join(" ")).toContain("relaxation time");
    expect(excerpts.join(" ")).not.toContain("Wheatstone");
  });
  it("creates different relevant diagrams for drift, bridge, junction and Ohm's law", () => {
    const make = (title: string) => renderLessonIllustration({ title, subject: "Physics" });
    expect(make("Drift velocity")).toContain("Electron drift");
    expect(make("Wheatstone bridge")).toContain(">G</text>");
    expect(make("Kirchhoff's junction rule")).toContain("I₁ + I₂ = I₃ + I₄");
    expect(make("Ohm's law")).toContain("V (volt)");
    expect(new Set(["Drift velocity", "Wheatstone bridge", "Kirchhoff's junction rule", "Ohm's law"].map(make)).size).toBe(4);
  });
});
