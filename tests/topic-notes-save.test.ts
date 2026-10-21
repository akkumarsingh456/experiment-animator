import { beforeEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  from: vi.fn(),
  source: vi.fn(),
  bindings: vi.fn(),
  sources: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (data: unknown) => data;
    const builder = {
      inputValidator: (fn: typeof validate) => {
        validate = fn;
        return builder;
      },
      handler: (fn: Function) => (input: { data: unknown }) => fn({ data: validate(input.data) }),
    };
    return builder;
  },
}));
vi.mock("@/lib/library-access.server", () => ({ assertLibraryAdmin: mocks.admin }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock("@/lib/attention-source-read.server", () => ({
  approvedAttentionUrl: (url: string) => url.startsWith("https://ncert.nic.in/"),
  attentionSourceBindings: mocks.bindings,
  readAttentionSources: mocks.sources,
  readAttentionSource: mocks.source,
}));
import { saveMissingTopicNotes, searchMissingTopic } from "@/lib/topic-notes.functions";
import { topicNotesKey } from "@/lib/topic-notes-store.server";
const scope = {
  klass: "12",
  subject: "Chemistry",
  chapter: "Chapter 5: Coordination Compounds",
  topic: "Werner’s theory",
};
const text =
  "The teacher adds a complete explanation for this topic.\nA second teaching step follows in a separate point.";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.admin.mockResolvedValue({ admin: true });
  mocks.bindings.mockReturnValue([]);
  mocks.sources.mockResolvedValue([]);
});
it("does not let an unverified visitor change future shared notes", async () => {
  mocks.admin.mockRejectedValue(new Error("Administrator sign-in required"));
  await expect(saveMissingTopicNotes({ data: { ...scope, text } })).rejects.toThrow(
    "Administrator",
  );
  expect(mocks.from).not.toHaveBeenCalled();
});
it("saves point-wise teacher notes with read-back confirmation and an exact scope key", async () => {
  let row: any;
  const upsert = vi.fn(async (value: any) => {
    row = value;
    return { error: null };
  });
  mocks.from.mockReturnValue({
    upsert,
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data: { result: row.result }, error: null }) }),
    }),
  });
  const saved = await saveMissingTopicNotes({ data: { ...scope, text } });
  expect(saved.mode).toBe("teacher");
  expect(saved.sections[0].lines).toHaveLength(2);
  expect(row.cache_key).toBe(topicNotesKey(scope));
  expect(topicNotesKey({ ...scope, klass: "11" })).not.toBe(row.cache_key);
  expect(topicNotesKey({ ...scope, topic: "Isomerism" })).not.toBe(row.cache_key);
});
it("reports failed storage without claiming a permanent save", async () => {
  mocks.from.mockReturnValue({ upsert: async () => ({ error: { code: "42501" } }) });
  await expect(saveMissingTopicNotes({ data: { ...scope, text } })).rejects.toThrow("not saved");
});
it("rejects an official-domain URL outside the matching class and chapter bindings", async () => {
  await expect(
    searchMissingTopic({ data: { ...scope, url: "https://ncert.nic.in/wrong-class.pdf" } }),
  ).rejects.toThrow("selected class and chapter");
  expect(mocks.source).not.toHaveBeenCalled();
});
it("rejects arbitrary URLs before making a remote request", async () => {
  await expect(
    searchMissingTopic({ data: { ...scope, url: "http://127.0.0.1/private" } }),
  ).rejects.toThrow("supported official");
  expect(mocks.source).not.toHaveBeenCalled();
});

it('uses the same saved scope for matching typographic title variants',()=>{
 expect(topicNotesKey(scope)).toBe(topicNotesKey({...scope,chapter:'Coordination Compounds',topic:"Werner's theory"}));
});
