import { it, expect, vi, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
const draft = vi.hoisted(() =>
  vi.fn(async () => ({
    lines: ["First AI point for this topic.", "Second AI point for this topic."],
    sources: [],
  })),
);
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/missing-topic-ai.functions", () => ({ draftMissingTopicPoints: draft }));
import { BlankTeacherSlideTools } from "@/components/BlankTeacherSlideTools";
import type { Slide } from "@/lib/generate.functions";
afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});
const slide = {
  title: "Teacher slide 1",
  teacher_blank: { id: "new-blank-id", topic: "Werner's Theory" },
  kind: "content",
  visual: "book",
  bullets: [""],
  notes: [],
  key_terms: [],
  sections: [],
} as Slide;
it("does not show edit or delete controls on existing slides", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(
      <BlankTeacherSlideTools
        slide={{ ...slide, teacher_blank: undefined }}
        klass="12"
        subject="Chemistry"
        chapter="Coordination Compounds"
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    ),
  );
  expect(host.textContent).toBe("");
  expect(draft).not.toHaveBeenCalled();
  await act(async () => root.unmount());
});
it("drafts for the original topic and applies only on request while leaving the slide object intact", async () => {
  const before = JSON.stringify(slide),
    apply = vi.fn(),
    remove = vi.fn(),
    host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(
      <BlankTeacherSlideTools
        slide={slide}
        klass="12"
        subject="Chemistry"
        chapter="Coordination Compounds"
        onUpdate={apply}
        onDelete={remove}
      />,
    ),
  );
  await act(async () =>
    Array.from(host.querySelectorAll("button"))
      .find((button) => button.textContent === "Draft AI important points")!
      .click(),
  );
  expect(draft).toHaveBeenCalledWith({
    data: {
      klass: "12",
      subject: "Chemistry",
      chapter: "Coordination Compounds",
      topic: "Werner's Theory",
      recoveryOnly: true,
      teacherChat: true,
      provider: "gemini",
    },
  });
  expect(apply).not.toHaveBeenCalled();
  const popup = document.querySelector('[role="dialog"]')!;
  expect(popup.querySelector("input[type=file]")?.getAttribute("accept")).toContain(".txt");
  await act(async () =>
    Array.from(popup.querySelectorAll("button"))
      .find((button) => button.textContent === "Import these notes")!
      .click(),
  );
  await act(async () =>
    Array.from(popup.querySelectorAll("button"))
      .find((button) => button.textContent === "Done")!
      .click(),
  );
  expect(apply).toHaveBeenCalledWith([
    "First AI point for this topic.",
    "Second AI point for this topic.",
  ]);
  expect(JSON.stringify(slide)).toBe(before);
  await act(async () =>
    Array.from(host.querySelectorAll("button"))
      .find((button) => button.textContent === "Delete this slide")!
      .click(),
  );
  expect(remove).toHaveBeenCalledOnce();
  await act(async () => root.unmount());
});
