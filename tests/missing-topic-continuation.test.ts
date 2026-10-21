import { beforeEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ trusted: vi.fn(), attention: vi.fn(), saved: vi.fn() }));
vi.mock("@/lib/trusted-chapter-source.server", () => ({ trustedChapterSource: mocks.trusted }));
vi.mock("@/lib/attention-topic-notes.server", () => ({ recoverAttentionTopic: mocks.attention }));
vi.mock("@/lib/topic-notes-store.server", () => ({ loadTopicNotes: mocks.saved }));
import { recoverSparseTopicNotes } from "@/lib/sparse-topic-recovery.server";
import type { Slide } from "@/lib/generate.functions";
const scope = {
  klass: "12",
  subject: "Chemistry",
  chapter: "Chapter 5: Coordination Compounds",
  sources: [],
};
const missing = () =>
  ({
    title: "Werner’s theory",
    kind: "content",
    visual: "book",
    bullets: [],
    notes: [],
    key_terms: [],
    sections: [],
  }) as Slide;
const good = () =>
  ({
    title: "Covalent bonding",
    kind: "content",
    visual: "book",
    bullets: [],
    notes: [],
    key_terms: [],
    sections: [
      {
        heading: "Explanation",
        kind: "bullets",
        lines: [
          "Covalent bonding involves sharing electron pairs between bonded atoms.",
          "The shared pair is attracted by the nuclei of both bonded atoms.",
          "A single covalent bond contains one shared pair of electrons.",
          "A double covalent bond contains two shared pairs of electrons.",
        ],
      },
    ],
  }) as Slide;
beforeEach(() => {
  mocks.trusted.mockResolvedValue(null);
  mocks.attention.mockResolvedValue(null);
  mocks.saved.mockResolvedValue(null);
});
it("continues before and after a missing topic and preserves working topics by identity", async () => {
  const a = good(),
    b = good(),
    gap = missing();
  const result = await recoverSparseTopicNotes([a, gap, b], scope);
  expect(result.slides).toHaveLength(3);
  expect(result.slides[0]).toBe(a);
  expect(result.slides[2]).toBe(b);
  expect(result.slides[1].topic_recovery?.status).toBe("missing");
  expect(result.slides[1].sections).toEqual([]);
  expect(gap.topic_recovery).toBeUndefined();
});
it("reuses saved teacher notes only for the missing topic and passes its exact identity", async () => {
  const saved = {
    mode: "teacher",
    sourceUrl: "",
    sections: [
      {
        heading: "Teacher notes",
        kind: "bullets",
        lines: ["The teacher writes this source-reviewed teaching explanation."],
      },
    ],
  };
  mocks.saved.mockResolvedValue(saved);
  const gap = missing(),
    a = good();
  const result = await recoverSparseTopicNotes([a, gap], scope);
  expect(result.slides[0]).toBe(a);
  expect(result.slides[1].sections).toBe(saved.sections);
  expect(result.slides[1].topic_recovery?.status).toBe("teacher");
  expect(mocks.saved).toHaveBeenCalledWith({ ...scope, topic: gap.title });
});
it("refreshes a saved missing-topic marker without changing its image metadata", async () => {
  const gap = {
    ...missing(),
    topic_recovery: { status: "missing" },
    image_url: "device-image-do-not-change",
  } as Slide;
  const result = await recoverSparseTopicNotes([gap], scope);
  expect(result.slides[0]).toBe(gap);
  expect((result.slides[0] as any).image_url).toBe("device-image-do-not-change");
});
