import { it, expect, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({
  key: vi.fn(),
  gateway: vi.fn(),
  sources: vi.fn(),
  mirror: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let parse = (value: unknown) => value;
    const builder = {
      inputValidator: (fn: typeof parse) => {
        parse = fn;
        return builder;
      },
      handler: (fn: Function) => (input: { data: unknown }) => fn({ data: parse(input.data) }),
    };
    return builder;
  },
}));
vi.mock("@/lib/topic-chat-providers.server", () => ({
  hasTopicChatProvider:mocks.key,
  topicChatDrafts:async function*(input:unknown){const draft=await mocks.gateway(input);if(draft)yield {draft,provider:'Gemini'};},
}));
vi.mock("@/lib/topic-notes-sources.server", () => ({readTopicNotesSources:mocks.sources}));
vi.mock("@/lib/trusted-chapter-source.server", () => ({ trustedChapterSource: mocks.mirror }));
import { draftMissingTopicPoints } from "@/lib/missing-topic-ai.functions";
const scope = {
  klass: "12",
  subject: "Chemistry",
  chapter: "Chapter 5: Coordination Compounds",
  topic: "Werner's Theory",
  recoveryOnly: true as const,
};
const points = [
  "Werner's theory states that coordination compounds have primary and secondary valencies.",
  "The primary valencies are normally ionisable and are satisfied by negative ions in coordination compounds.",
  "The secondary valencies are non ionisable and are satisfied by neutral molecules or negative ions.",
  "The ions or groups bound by secondary linkages have characteristic spatial arrangements corresponding to the coordination number.",
];
beforeEach(() => {
  vi.clearAllMocks();
  mocks.key.mockReturnValue(true);
  mocks.mirror.mockResolvedValue(null);
  mocks.sources.mockResolvedValue([
    {
      url: "https://ncert.nic.in/chapter.pdf",
      title: scope.chapter,
      sourceClass: "12",
      provider: "NCERT",
      text: points.join(" "),
    },
  ]);
  mocks.gateway.mockResolvedValue({
    topic_present: true,
    notes: points.map((text) => ({
      heading: "Important points",
      text,
      evidence: [{ source: 0, quote: text }],
    })),
  });
});
it("requires an explicit recovery action before calling AI", async () => {
  expect(() => draftMissingTopicPoints({ data: { ...scope, recoveryOnly: false } })).toThrow();
  expect(mocks.gateway).not.toHaveBeenCalled();
});
it("returns a few evidence-supported points without saving or changing lesson data", async () => {
  const result = await draftMissingTopicPoints({ data: scope });
  expect(result.lines).toHaveLength(4);
  expect(mocks.gateway.mock.calls[0][0].prompt).toContain("Class 12");
  expect(mocks.gateway.mock.calls[0][0].prompt).toContain("not verbatim NCERT extraction");
});
it("rejects fabricated supporting quotes instead of accepting the draft", async () => {
  mocks.gateway.mockResolvedValue({
    topic_present: true,
    notes: points.map((text) => ({
      heading: "Important points",
      text,
      evidence: [
        { source: 0, quote: "This invented source quote does not occur in the original evidence." },
      ],
    })),
  });
  await expect(draftMissingTopicPoints({ data: scope })).rejects.toThrow("source-checked notes");
});
it("keeps extraction available when the server has no AI configuration", async () => {
  mocks.key.mockReturnValue(false);
  await expect(draftMissingTopicPoints({ data: scope })).rejects.toThrow("Connect Gemini");
  expect(mocks.sources).not.toHaveBeenCalled();
  expect(mocks.gateway).not.toHaveBeenCalled();
});

it("rejects malformed AI output safely", async () => {
  mocks.gateway.mockResolvedValue({ notes: null });
  await expect(draftMissingTopicPoints({ data: scope })).rejects.toThrow("source-checked notes");
});
