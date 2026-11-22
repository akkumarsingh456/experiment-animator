import { describe, expect, it } from "vitest";
import { lessonGenerationRequestKey } from "@/lib/lesson-generation-request";

const base = {
  workspaceId: "",
  topic: "Acids, Bases and Salts",
  klass: "10",
  subject: "Science",
  chapter: "Chapter 2: Acids, Bases and Salts (Chemistry)",
  subtopics: "pH scale",
  mode: "topic" as const,
  go: "1",
};

describe("lesson generation request identity", () => {
  it("is stable for the same complete lesson scope", () => {
    expect(lessonGenerationRequestKey(base, 0)).toBe(lessonGenerationRequestKey({ ...base }, 0));
  });

  it.each([
    ["topic", { topic: "Chemical Reactions" }],
    ["class", { klass: "9" }],
    ["subject", { subject: "Mathematics" }],
    ["chapter", { chapter: "Chapter 3: Metals and Non-metals" }],
    ["subtopics", { subtopics: "Chemical properties" }],
    ["mode", { mode: "chapter" as const }],
    ["workspace owner scope", { workspaceId: "saved-lesson-id" }],
    ["navigation trigger", { go: "" }],
  ])("changes when %s changes", (_label, patch) => {
    expect(lessonGenerationRequestKey({ ...base, ...patch }, 0)).not.toBe(lessonGenerationRequestKey(base, 0));
  });

  it("changes on retry", () => {
    expect(lessonGenerationRequestKey(base, 1)).not.toBe(lessonGenerationRequestKey(base, 0));
  });

  it("keeps anonymous and signed-in public generation on the same scope identity", () => {
    // Authentication is intentionally not part of public lesson identity:
    // login is optional for generating and viewing public lesson materials.
    expect(lessonGenerationRequestKey(base, 0)).toBe(lessonGenerationRequestKey({ ...base }, 0));
  });
});
