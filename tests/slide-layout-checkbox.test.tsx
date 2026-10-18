import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, it, expect, vi } from "vitest";
import { SlideLayoutCheck } from "@/components/SlideLayoutCheck";
import { materializeLayout, type LayoutPage } from "@/lib/slide-layout-check";
vi.mock("@/lib/slide-layout-check", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/slide-layout-check")>();
  return {
    ...original,
    slideSpace: vi.fn((element: HTMLElement, _page: LayoutPage, index: number) => ({
      page: index,
      fill: element.textContent!.length > 1 ? 0.5 : 0.15,
      overflow: false,
      exempt: false,
    })),
  };
});
afterEach(() => vi.unstubAllGlobals());
describe("layout checkbox workflow", () => {
  it("checks all pages, combines them, then independently verifies the result", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
      setTimeout(() => callback(0), 0),
    );
    const base = ["a", "b", "c"].map(
      (line) =>
        ({
          title: "Topic",
          sourceIndex: 1,
          sections: [{ heading: "Notes", kind: "bullets", lines: [line] }],
        }) as LayoutPage,
    );
    function Harness() {
      const [groups, setGroups] = useState([[0], [1], [2]]);
      const pages = materializeLayout(base, groups);
      return (
        <SlideLayoutCheck
          base={base}
          pages={pages}
          groups={groups}
          onOrganise={setGroups}
          renderPage={(page) => (
            <div>{page.sections?.flatMap((section) => section.lines).join("")}</div>
          )}
        />
      );
    }
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(<Harness />));
    for (let i = 0; i < 30 && !host.textContent?.includes("Layout verified."); i++)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    expect(host.querySelector<HTMLInputElement>("input")?.checked).toBe(true);
    expect(host.textContent).toContain("Checked 1/1 slides");
    expect(host.textContent).toContain("2 continuation pages combined");
    expect(host.textContent).toContain("Layout verified. Every source entry is preserved.");
    await act(async () => host.querySelector<HTMLInputElement>("input")!.click());
    expect(host.textContent).toContain("Automatic layout checking is off.");
    await act(async () => root.unmount());
    host.remove();
  });
});
