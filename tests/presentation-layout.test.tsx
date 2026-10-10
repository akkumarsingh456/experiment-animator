import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FormulaMindMap, formulaMapTopics } from "@/components/FormulaMindMap";
import { GuidedLessonNotes } from "@/components/GuidedLessonNotes";
import { paginateGuidedArticles, slideFitScale, splitOversizedText } from "@/lib/guided-slides";
import { prepareSlideExport } from "@/lib/lesson-slide-export";
import type { Slide } from "@/lib/generate.functions";

const lesson: Slide = { title: "Uniform acceleration", visual: "graph", bullets: [], notes: [], key_terms: [], sections: [{ heading: "Teacher Notes", kind: "bullets", lines: [
  "**Formula:** Velocity | $v=u+at$ | $\\mathrm{m\\,s^{-1}}$",
  "**Unit:** Velocity: unit used $\\mathrm{m/s}$; SI unit $\\mathrm{m\\,s^{-1}}$.",
  "**Derivation of velocity:** $v=u+at$",
  "**Derivation step 1:** From the definition, $a=\\frac{v-u}{t}$ for constant acceleration.",
  "**Derivation step 2:** Multiply by $t$: $at=v-u$.",
  "**Derivation step 3:** Add $u$: $v=u+at$.",
] }] };

describe("Complete formula recap and units", () => {
  it("ends the guided document with a rendered formula map and preserves all derivation steps", () => {
    const html = renderToStaticMarkup(<GuidedLessonNotes slides={[lesson]} title="Motion" klass="9" subject="Science" />);
    expect(html).toContain("Unit / SI unit"); expect(html).toContain("Symbols, units and SI units");
    expect(html).toContain("katex"); expect(html).toContain("From the definition");
    expect(html).toContain("Multiply by"); expect(html).toContain("Add");
    expect(html.lastIndexOf("Formula mind map")).toBeGreaterThan(html.indexOf("Step-by-step derivation"));
    expect(formulaMapTopics([lesson, lesson])[0].formulas).toHaveLength(1);
  });
  it("retains every distinct formula, respects case and does not fabricate literature formulas", () => {
    const many = { ...lesson, sections: [{ heading: "Teacher Notes", kind: "bullets" as const, lines: Array.from({ length: 30 }, (_, i) => `**Formula:** $x_{${i}}=y_{${i}}$`) }] };
    expect(formulaMapTopics([many])[0].formulas).toHaveLength(30);
    const cases = { ...many, sections: [{ ...many.sections[0], lines: ["**Formula:** $V=IR$", "**Formula:** $v=ir$"] }] };
    expect(formulaMapTopics([cases])[0].formulas).toHaveLength(2);
    expect(renderToStaticMarkup(<FormulaMindMap slides={[{ ...lesson, sections: [], notes: ["The speaker describes a memory."] }]} />)).toBe("");
  });
});

describe("No-scroll slide fitting", () => {
  it("shows each section heading once per page while retaining every list item", () => {
    const root = document.createElement("div"); root.innerHTML = '<div class="guided-notes"><article class="guided-topic"><h2>Topic</h2><section><h3>Derivation</h3><ol><li>First</li><li>Second</li><li>Third</li></ol></section></article></div>';
    document.body.appendChild(root);
    const height = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(200);
    try {
      const pages = paginateGuidedArticles(root, 400);
      expect(pages).toHaveLength(1); expect(pages[0].querySelectorAll("h3")).toHaveLength(1);
      expect(Array.from(pages[0].querySelectorAll("li")).map((item) => item.textContent)).toEqual(["First", "Second", "Third"]);
    } finally { height.mockRestore(); root.remove(); }
  });
  it("splits oversized prose while preserving emphasis and entire math nodes", () => {
    const block = document.createElement("section");
    block.innerHTML = `<h3>Explanation</h3><p><strong>${Array.from({ length: 90 }, (_, i) => `word${i}`).join(" ")}</strong> <span class="katex"><span>v = u + at</span></span> ${Array.from({ length: 90 }, (_, i) => `tail${i}`).join(" ")}</p>`;
    const parts = splitOversizedText(block);
    expect(parts.length).toBeGreaterThan(2);
    const words = parts.map((part) => part.querySelector("p")!.textContent).join("").replace(/\s+/g, " ");
    expect(words).toBe(block.querySelector("p")!.textContent!.replace(/\s+/g, " "));
    expect(parts.flatMap((part) => Array.from(part.querySelectorAll(".katex")))).toHaveLength(1);
    expect(parts[0].querySelector("strong")).not.toBeNull();
  });
  it("fits wide and tall atomic content without clipping either dimension", () => {
    for (const [width, height] of [[2400, 300], [600, 1800], [2200, 1800], [600, 400]]) {
      const scale = slideFitScale(1280, 720, width, height);
      expect(width * scale).toBeLessThanOrEqual(1280);
      expect(height * scale).toBeLessThanOrEqual(720);
      expect(scale).toBeLessThanOrEqual(1);
    }
  });
  it("creates continuation pages rather than overflowing long text", () => {
    const root = document.createElement("div");
    root.innerHTML = `<div class="guided-notes"><article class="guided-topic"><h2>Long passage</h2><section><p>${Array.from({ length: 220 }, (_, i) => `word${i}`).join(" ")}</p></section></article></div>`;
    document.body.appendChild(root);
    const height = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) { return 80 + (this.textContent?.split(/\s+/).length || 0) * 3; });
    try {
      const pages = paginateGuidedArticles(root, 300);
      expect(pages.length).toBeGreaterThan(1);
      const text = pages.flatMap((page) => Array.from(page.querySelectorAll("p")).map((paragraph) => paragraph.textContent)).join(" ");
      for (let i = 0; i < 220; i++) expect(text.match(new RegExp(`\\bword${i}\\b`, "g"))).toHaveLength(1);
      expect(pages.every((page) => page.scrollHeight * Number(page.dataset.fitScale) <= 300)).toBe(true);
    } finally { height.mockRestore(); root.remove(); }
  });
  it("prepares fixed landscape export frames using the measured note content", async () => {
    const root = document.createElement("div");
    root.innerHTML = `<div class="guided-notes"><article class="guided-topic"><h2>Formula</h2><p><span class="katex">rendered fraction</span></p></article></div>`;
    document.body.appendChild(root);
    const fonts = Object.getOwnPropertyDescriptor(document, "fonts");
    Object.defineProperty(document, "fonts", { configurable: true, value: { ready: Promise.resolve() } });
    try {
      const pages = await prepareSlideExport(root);
      expect(pages).toHaveLength(1);
      expect(pages[0].style.width).toBe("1280px"); expect(pages[0].style.height).toBe("720px");
      expect(pages[0].querySelector(".katex")?.textContent).toBe("rendered fraction");
      expect(pages[0].style.overflow).toBe("hidden");
    } finally { root.remove(); if (fonts) Object.defineProperty(document, "fonts", fonts); else delete (document as any).fonts; }
  });
});
