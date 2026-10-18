import { describe, it, expect } from "vitest";
import {
  compactLayoutGroups,
  materializeLayout,
  sameLayoutContent,
  slideSpace,
  type LayoutPage,
} from "@/lib/slide-layout-check";
const page = (line: string, sourceIndex = 1): LayoutPage =>
  ({
    title: "Semiconductors",
    sourceIndex,
    sections: [{ heading: "Original extraction", kind: "bullets", lines: [line] }],
  }) as LayoutPage;
const measurements = (...fills: number[]) =>
  fills.map((fill, page) => ({ page, fill, overflow: false, exempt: false }));
describe("free slide layout verification", () => {
  it("packs sparse continuation pages and preserves duplicate entries exactly", () => {
    const pages = [page("a"), page("a"), page("b")];
    const raw = JSON.stringify(pages);
    const groups = compactLayoutGroups(pages, measurements(0.15, 0.15, 0.2));
    const result = materializeLayout(pages, groups);
    expect(result).toHaveLength(1);
    expect(sameLayoutContent(pages, result)).toBe(true);
    expect(JSON.stringify(pages)).toBe(raw);
  });
  it("never merges different source topics", () =>
    expect(compactLayoutGroups([page("a"), page("b", 2)], measurements(0.1, 0.1))).toEqual([
      [0],
      [1],
    ]));
  it("retains full pages and overflowing pages separately", () =>
    expect(compactLayoutGroups([page("a"), page("b")], measurements(0.8, 0.3))).toEqual([
      [0],
      [1],
    ]));
  it("rejects missing, duplicate or reordered pages", () => {
    for (const groups of [[[0]], [[0], [0]], [[1], [0]]])
      expect(() => materializeLayout([page("a"), page("b")], groups)).toThrow();
  });
  it("protects cover pages even with sparse measurements", () => {
    const cover = { ...page("cover"), visual: "cover" } as LayoutPage;
    expect(compactLayoutGroups([cover, page("a")], measurements(0.1, 0.1))).toEqual([[0], [1]]);
    expect(() => materializeLayout([cover, page("a")], [[0, 1]])).toThrow();
    expect(sameLayoutContent([cover], [])).toBe(false);
  });
  it("detects dropped and altered notes", () => {
    expect(sameLayoutContent([page("a"), page("b")], [page("a")])).toBe(false);
    expect(sameLayoutContent([page("a")], [page("edited")])).toBe(false);
  });
  it("measures allocated notes height rather than the short card height", () => {
    const root = document.createElement("div");
    root.innerHTML = "<div><div data-note-sheet><div data-note-content></div></div></div>";
    const host = root.firstElementChild!,
      box = host.firstElementChild!,
      content = box.firstElementChild!;
    document.body.append(root);
    Object.defineProperty(host, "clientHeight", { value: 600 });
    Object.defineProperty(box, "clientWidth", { value: 500 });
    Object.defineProperty(content, "scrollHeight", { value: 120 });
    Object.defineProperty(content, "scrollWidth", { value: 450 });
    expect(slideSpace(root, page("a"), 0).fill).toBe(0.2);
    root.remove();
  });
  it("does not certify unmeasurable notes", () => {
    const root = document.createElement("div");
    root.innerHTML = "<div data-note-sheet><div data-note-content></div></div>";
    expect(() => slideSpace(root, page("a"), 0)).toThrow();
  });
});
