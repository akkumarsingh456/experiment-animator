import { it, expect, vi, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
const search = vi.hoisted(() => vi.fn(async () => [] as any[]));
vi.mock("@/lib/missing-topic-ai.functions", () => ({
  draftMissingTopicPoints: async () => ({
    lines: ["AI draft important point for review."],
    sources: [],
  }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/topic-notes.functions", () => ({
  getSimpleTopicNotes: async () => ({lines:["Primary valencies are normally ionisable.","Secondary valencies are non ionisable."],sources:[],label:"Source notes"}),
  readMissingTopicNotes: async () => null,
  searchMissingTopic: search,
  saveMissingTopicNotes: async () => {
    throw new Error("Not used");
  },
}));
vi.mock("@/components/GuidedLessonNotes", () => ({ GuidedLessonNotes: () => null }));
import { GuidedNotesPresentation } from "@/components/GuidedNotesPresentation";
import { MissingTopicNotes } from "@/components/MissingTopicNotes";
import type { Slide } from "@/lib/generate.functions";
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "fullscreenElement");
  document.body.innerHTML = "";
});
const slide = {
  title: "Werner's Theory",
  kind: "content",
  visual: "book",
  bullets: [],
  notes: [],
  key_terms: [],
  sections: [],
  topic_recovery: { status: "missing" },
} as Slide;
it("shows topic recovery inside the deck and preserves next and previous navigation", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host),
    close = vi.fn();
  const change = vi.fn();
  await act(async () =>
    root.render(
      <GuidedNotesPresentation
        title="Chapter 5"
        klass="12"
        subject="Chemistry"
        slides={[slide]}
        onClose={close}
        onPdf={() => {}}
        onPageChange={change}
        presentationSlides={[
          { title: slide.title, content: <p>Partial source notes</p> },
          { title: "Complete topic", content: <p>Existing good notes</p> },
        ]}
        renderTopicRecovery={(title) =>
          title === slide.title ? (
            <MissingTopicNotes
              compact
              slide={slide}
              klass="12"
              subject="Chemistry"
              chapter="Chapter 5: Coordination Compounds"
              onSaved={() => {}}
            />
          ) : null
        }
      />,
    ),
  );
  const deck = host.querySelector(".guided-presentation")!;
  const button = Array.from(deck.querySelectorAll("button")).find(
    (button) => button.textContent === "Add or remove notes",
  )!;
  expect(button).toBeTruthy();
  expect(deck.querySelector(".presentation-footer")).toBeTruthy();
  await act(async () => button.click());
  const popup = document.querySelector('[role="dialog"]:not([aria-label="Lesson presentation"])')!;
  expect(popup.querySelector("textarea")).toBeTruthy();
  expect(popup.querySelector("#simple-topic-notes")).toBeTruthy();
  await act(async () =>
    popup.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })),
  );
  expect(change).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  await act(async () =>
    popup.querySelector<HTMLButtonElement>('[aria-label="Close topic notes"]')!.click(),
  );
  await act(async () =>
    deck.querySelector<HTMLButtonElement>('[aria-label="Next slide"]')!.click(),
  );
  expect(change).toHaveBeenLastCalledWith(1);
  expect(deck.textContent).not.toContain("Add or remove notes");
  await act(async () =>
    deck.querySelector<HTMLButtonElement>('[aria-label="Previous slide"]')!.click(),
  );
  expect(change).toHaveBeenLastCalledWith(0);
  expect(deck.textContent).toContain("Add or remove notes");
  await act(async () => root.unmount());
});
it("keeps the popup inside the browser fullscreen element", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: host });
  const root = createRoot(host);
  await act(async () =>
    root.render(
      <MissingTopicNotes
        compact
        slide={slide}
        klass="12"
        subject="Chemistry"
        chapter="Chapter 5: Coordination Compounds"
        onSaved={() => {}}
      />,
    ),
  );
  await act(async () => host.querySelector<HTMLButtonElement>("button")!.click());
  expect(host.querySelector('[role="dialog"]')).toBeTruthy();
  await act(async () => root.unmount());
});

it("automatically displays readable text previews and imports the selected result", async () => {
  search.mockResolvedValueOnce([
    {
      url: "https://ncert.nic.in/chapter.pdf",
      title: "Matching source",
      complete: true,
      lines: [
        "Primary valencies are normally ionisable.",
        "Secondary valencies are non ionisable.",
      ],
    },
  ]);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(
      <MissingTopicNotes
        slide={slide}
        klass="12"
        subject="Chemistry"
        chapter="Chapter 5: Coordination Compounds"
        onSaved={() => {}}
      />,
    ),
  );
  await act(async () => host.querySelector<HTMLButtonElement>("button")!.click());
  const popup = document.querySelector('[role="dialog"]')!;
  await act(async()=>Array.from(popup.querySelectorAll('button')).find(button=>button.textContent==='Search notes here')!.click());
  expect(popup.querySelector('[aria-label="Source notes preview"]')?.textContent).toContain(
    "Primary valencies",
  );
  expect(search).toHaveBeenCalledWith({
    data: expect.objectContaining({ klass: "12", topic: slide.title }),
  });
  await act(async () =>
    Array.from(popup.querySelectorAll("button"))
      .find((button) => button.textContent === "Import these notes")!
      .click(),
  );
  expect(popup.querySelector<HTMLTextAreaElement>("#teacher-topic-text")?.value).toContain(
    "Primary valencies are normally ionisable.\nSecondary valencies",
  );
  await act(async () => root.unmount());
});

it("loads preview without changing the lesson until Extract notes is clicked", async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),saved=vi.fn();
 await act(async()=>root.render(<MissingTopicNotes slide={slide} klass="12" subject="Chemistry" chapter="Coordination Compounds" onSaved={saved}/>));
 await act(async()=>host.querySelector('button')!.click());const popup=document.querySelector('[role="dialog"]')!;
 await act(async()=>Array.from(popup.querySelectorAll('button')).find(button=>button.textContent==='Use textbook notes')!.click());
 expect(popup.querySelector<HTMLTextAreaElement>('#simple-topic-notes')!.value).toContain('Primary valencies');
 expect(saved).not.toHaveBeenCalled();
 await act(async()=>Array.from(popup.querySelectorAll('button')).find(button=>button.textContent==='Insert notes')!.click());
 expect(saved).toHaveBeenCalledWith(expect.objectContaining({teacher_supplement:expect.objectContaining({lines:expect.arrayContaining(['Primary valencies are normally ionisable.'])})}));
 await act(async()=>root.unmount());
});

it("offers Add blank slide only when the recovery host provides that action", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host),
    add = vi.fn();
  await act(async () =>
    root.render(
      <MissingTopicNotes
        slide={slide}
        klass="12"
        subject="Chemistry"
        chapter="Chapter 5: Coordination Compounds"
        onSaved={() => {}}
        onAddBlankSlide={add}
      />,
    ),
  );
  await act(async () => host.querySelector<HTMLButtonElement>("button")!.click());
  const popup = document.querySelector('[role="dialog"]')!;
  await act(async () =>
    Array.from(popup.querySelectorAll("button"))
      .find((button) => button.textContent === "Add blank slide")!
      .click(),
  );
  expect(add).toHaveBeenCalledOnce();
  expect(document.querySelector('[role="dialog"]')).toBeTruthy();
  await act(async () => root.unmount());
  host.remove();
});
