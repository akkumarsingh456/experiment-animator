import { describe, it, expect } from "vitest";
import type { Slide } from "@/lib/generate.functions";
import {
  hasMeaningfulSlide,
  noteSpaceBalance,
  balanceGuidedPage,
} from "@/lib/slide-space-organizer";
import {
  materializeLayout,
  sameLayoutContent,
  compactLayoutGroups,
  type LayoutPage,
} from "@/lib/slide-layout-check";
import { paginateGuidedArticles } from "@/lib/guided-slides";
const slide = (patch: Partial<Slide> = {}): Slide => ({
  title: "",
  bullets: [],
  notes: [],
  key_terms: [],
  visual: "",
  sections: [],
  ...patch,
});
describe("post-generation organizer only", () => {
  it("omits genuinely empty records but preserves all meaningful variants", () => {
    expect(hasMeaningfulSlide(slide())).toBe(false);
    expect(hasMeaningfulSlide(slide({ title: " \u200b ", notes: [" \n "] }))).toBe(false);
    for (const patch of [
      { title: "Summary" },
      { notes: ["An explanation."] },
      { sections: [{ heading: "Formula", kind: "formula", lines: ["$E=mc^2$"] }] },
      { teacher_pdf: { path: "book.pdf", page: 1, file_name: "book.pdf" } },
      { reference_visuals: [{ url: "image.png" }] },
      {
        context_illustration: {
          url: "image.png",
          provider: "Hugging Face",
          description: "Original diagram",
        },
      },
    ] as Partial<Slide>[])
      expect(hasMeaningfulSlide(slide(patch))).toBe(true);
  });
  it("keeps spacing bounded and does not stretch content-heavy pages", () => {
    expect(noteSpaceBalance(600, 100, 1)).toEqual({ gap: 14, inset: 64 });
    expect(noteSpaceBalance(600, 590, 12)).toEqual({ gap: 0, inset: 0 });
    expect(noteSpaceBalance(0, 100, 1)).toEqual({ gap: 0, inset: 0 });
  });
  it("rejects merges that would lose a distinct diagram or any other payload", () => {
    const a = {
      ...slide({ title: "Topic", sections: [{ heading: "Notes", kind: "bullets", lines: ["A"] }] }),
      sourceIndex: 1,
    };
    const b = {
      ...a,
      context_illustration: {
        url: "second.png",
        provider: "Hugging Face" as const,
        description: "Second diagram",
      },
    };
    const measurements = [0, 1].map((page) => ({
      page,
      fill: 0.1,
      exempt: false,
      overflow: false,
    }));
    expect(compactLayoutGroups([a, b], measurements)).toEqual([[0], [1]]);
    expect(() => materializeLayout([a, b], [[0, 1]])).toThrow();
    expect(sameLayoutContent([a, b], [a])).toBe(false);
  });
  for (const [klass, subject, chapter, formula] of [
    ["9", "Science", "Atoms and Molecules", "$H_2O$"],
    ["10", "Social Science", "Power-sharing", "Belgium and Sri Lanka"],
    ["11", "Mathematics", "Quadratic Equations", "$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$"],
    ["12", "Physics", "Semiconductors", "$n_e n_h=n_i^2$"],
  ])
    for (const size of [1, 6, 30])
      it(`preserves Class ${klass} ${subject} ${chapter}, ${size} existing points`, () => {
        const sections = [
          {
            heading: "Original notes",
            kind: "bullets" as const,
            lines: Array.from(
              { length: size },
              (_, index) => `${index + 1}. ${formula} Existing explanation ${index + 1}.`,
            ),
          },
        ];
        const original = slide({
          title: chapter,
          sections,
          caption: `Class ${klass} ${subject}`,
          reference_visuals: [{ url: "source.png" } as any],
        });
        const snapshot = JSON.stringify(original);
        const baseline: LayoutPage[] = sections[0].lines.map((line) => ({
          ...original,
          sourceIndex: 0,
          sections: [{ ...sections[0], lines: [line] }],
        }));
        const measured = baseline.map((_, page) => ({
          page,
          fill: size === 30 ? 0.5 : 0.12,
          overflow: false,
          exempt: false,
        }));
        const packed = materializeLayout(baseline, compactLayoutGroups(baseline, measured));
        expect(sameLayoutContent(baseline, packed)).toBe(true);
        expect(JSON.stringify(original)).toBe(snapshot);
        expect(
          packed.flatMap((page) => page.sections!.flatMap((section) => section.lines)),
        ).toEqual(sections[0].lines);
        expect(packed.every((page) => page.reference_visuals === original.reference_visuals)).toBe(
          true,
        );
      });
  it("skips a completely blank guided article while retaining formula and image articles", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<div class="guided-notes"><article class="guided-topic"> </article><article class="guided-topic"><h2>Formula</h2><p>E = mc²</p></article><article class="guided-topic"><img src="source.png" alt="Original"></article></div>';
    document.body.append(root);
    const pages = paginateGuidedArticles(root, 720);
    expect(pages).toHaveLength(2);
    expect(pages[0].textContent).toContain("E = mc²");
    expect(pages[1].querySelector("img")?.getAttribute("src")).toBe("source.png");
    root.remove();
  });
  it("balances DOM position without changing text, table nodes or image sources", () => {
    const page = document.createElement("article");
    page.innerHTML =
      '<h2>Existing heading</h2><p>Existing explanation</p><table><tbody><tr><td>Original value</td></tr></tbody></table><img src="existing.png">';
    page.style.padding = "20px";
    document.body.append(page);
    for (const child of page.children) Object.defineProperty(child, "offsetHeight", { value: 40 });
    const text = page.textContent;
    const table = page.querySelector("table");
    balanceGuidedPage(page, 720);
    expect(parseFloat(page.style.paddingTop)).toBeGreaterThan(20);
    expect(page.textContent).toBe(text);
    expect(page.querySelector("table")).toBe(table);
    expect(page.querySelector("img")?.getAttribute("src")).toBe("existing.png");
    page.remove();
  });
});
