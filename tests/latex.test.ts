import { describe, it, expect } from "vitest";
import { normalizeLatex, normalizeLine, autoLatex, isValidLatex } from "@/lib/latex-notation";
describe("latex", () => {
  it("fractions", () => { expect(normalizeLatex("1/2 m v^2")).toContain("\\frac{1}{2}"); });
  it("chem", () => { expect(normalizeLatex("H2SO4")).toBe("H_{2}SO_{4}"); });
  it("unicode", () => { const r = normalizeLatex("ε₀ = 8.85 × 10⁻¹²"); expect(isValidLatex(r)).toBe(true); expect(r).toContain("\\varepsilon"); });
  it("unbalanced", () => { expect(isValidLatex(normalizeLatex("\\frac{1}{2"))).toBe(true); });
  it("dangling", () => { expect(isValidLatex(normalizeLatex("x^"))).toBe(true); });
  it("line", () => { const r = normalizeLine("Formula: $\\frac{a}{b$"); expect(r.length).toBeGreaterThan(0); });
  it("auto", () => { const r = autoLatex("v = u + at"); expect(r).toContain("$"); });
  it("keeps good latex", () => { expect(normalizeLatex("\\oint \\mathbf{E}\\cdot d\\mathbf{A}")).toContain("\\oint"); });
});
