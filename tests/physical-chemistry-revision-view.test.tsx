import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GuidedLessonNotes } from "@/components/GuidedLessonNotes";
import type { Slide } from "@/lib/generate.functions";
import { paginateGuidedArticles } from "@/lib/guided-slides";
describe("final revision in shared guided presentation/export DOM", () => {
  it("uses the selected chapter cover when the lesson title is a subtopic, and stays last", () => {
    const slides: Slide[] = [
      {
        title: "Chapter 1: Solutions",
        kind: "break",
        visual: "cover",
        bullets: [],
        notes: [],
        key_terms: [],
      },
      {
        title: "Concentration Terms",
        kind: "content",
        visual: "",
        bullets: [],
        notes: [],
        key_terms: [],
        sections: [
          {
            heading: "Teacher Notes",
            kind: "bullets",
            lines: [
              String.raw`**Formula:** $c=\frac{n}{V}$`,
              "**Key point:** Use the stated solution volume.",
            ],
          },
        ],
      },
    ];
    const before = JSON.stringify(slides);
    const html = renderToStaticMarkup(
      <GuidedLessonNotes
        slides={slides}
        title="Concentration Terms"
        klass="12"
        subject="Chemistry"
      />,
    );
    const root = document.createElement("div");
    root.innerHTML = html;
    const revision = root.querySelector('[data-physical-revision="true"]')!;
    expect(revision).not.toBeNull();
    expect(revision).toBe(root.querySelector(".guided-notes")!.lastElementChild);
    expect(revision.textContent).toContain("Use the stated solution volume.");
    expect(revision.querySelector(".katex")).not.toBeNull();
    expect(revision.querySelector(".katex-error")).toBeNull();
    document.body.append(root);
    const pages = paginateGuidedArticles(root, 720);
    expect(pages.at(-1)!.textContent).toContain("Physical Chemistry — final revision");
    expect(JSON.stringify(slides)).toBe(before);
    root.remove();
  });
});
