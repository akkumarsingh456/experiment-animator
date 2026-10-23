import { trustedChapterSource } from "./trusted-chapter-source.server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  topicNotesScope,
  topicNotesKey,
  loadTopicNotes,
  type SavedTopicNotes,
} from "./topic-notes-store.server";
import { canonicalOfficialRecoveryTopic } from "./official-recovery-scope";
import {
  readAttentionSources,
  readAttentionSource,
  approvedAttentionUrl,
  attentionSourceBindings,
} from "./attention-source-read.server";
import { recoverTopicFromSources } from "./topic-source-recovery";
function canonical(scope: z.infer<typeof topicNotesScope>) {
  const match = canonicalOfficialRecoveryTopic(scope);
  if (!match)
    throw new Error("Choose a matching class, subject, chapter and topic from the catalogue.");
  return match;
}
async function matchingSource(scope: z.infer<typeof topicNotesScope>, url: string) {
  if (!approvedAttentionUrl(url)) throw new Error("Use a supported official source link.");
  const normal = (value: string) => {
    const parsed = new URL(value);
    parsed.hash = "";
    return parsed.href;
  };
  const binding = attentionSourceBindings(scope).find(
    (source) => normal(source.url) === normal(url),
  );
  if (binding) return readAttentionSource(binding);
  const sources = await readAttentionSources(scope);
  const match = sources.find((source) => normal(source.url) === normal(url));
  if (!match) {
    const mirror = await trustedChapterSource(scope.klass, scope.subject, scope.chapter);
    if (mirror && normal(mirror.url) === normal(url))
      return {
        ...mirror,
        title: scope.chapter,
        sourceClass: scope.klass,
        provider: "IIT Kanpur SATHEE NCERT mirror",
      };
  }
  if (!match)
    throw new Error(
      "This link is not a checked source for the selected class and chapter. Use Find official text, or write teacher notes for review.",
    );
  return match;
}
export const searchMissingTopic = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    topicNotesScope.extend({ url: z.string().max(2000).optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const scope = canonical(data);
    const sources = data.url
      ? await Promise.all([matchingSource(scope, data.url)])
      : await readAttentionSources(scope);
    const preview = (source: NonNullable<(typeof sources)[number]>) => {
      const recovered = recoverTopicFromSources(scope.topic, [source.text]);
      return {
        url: source.url,
        title: source.title,
        lines: recovered.lines,
        complete: recovered.complete,
      };
    };
    const previews = sources.flatMap((source) => (source ? [preview(source)] : []));
    // Only this user-opened picker retries a second official chapter reader.
    // The existing generation and extraction pathway stays unchanged.
    if (!data.url && !previews.some((item) => item.complete)) {
      const mirror = await trustedChapterSource(scope.klass, scope.subject, scope.chapter);
      if (mirror && !previews.some((item) => item.url === mirror.url))
        previews.push(
          preview({
            ...mirror,
            title: scope.chapter,
            sourceClass: scope.klass,
            provider: "IIT Kanpur SATHEE NCERT mirror",
          }),
        );
    }
    if (!previews.length)
      throw new Error("The official chapter sources could not be read right now. Retry the search, or provide a checked official chapter link. Your existing notes are unchanged.");
    return previews.sort(
      (a, b) => Number(b.complete) - Number(a.complete) || b.lines.length - a.lines.length,
    );
  });
export const readMissingTopicNotes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => topicNotesScope.parse(input))
  .handler(async ({ data }) => loadTopicNotes(canonical(data)));
export const saveMissingTopicNotes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    topicNotesScope
      .extend({
        text: z.string().trim().min(10).max(200000),
        url: z.string().max(2000).default(""),
        official: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { assertLibraryAdmin } = await import("./library-access.server");
    await assertLibraryAdmin();
    const scope = canonical(data);
    let lines = data.text
      .split(/\n+/)
      .map((line) => (data.official ? line : line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "")).trim())
      .filter(Boolean);
    let mode: SavedTopicNotes["mode"] = "teacher";
    if (lines.length > 500 || lines.some((line) => line.length > 1800))
      throw new Error("Use up to 500 separate points, each under 1,800 characters.");
    if (data.official) {
      if (!approvedAttentionUrl(data.url)) throw new Error("Use a supported official source link.");
      const source = await matchingSource(scope, data.url);
      const recovered = source ? recoverTopicFromSources(scope.topic, [source.text]) : null;
      if (!recovered?.complete || JSON.stringify(lines) !== JSON.stringify(recovered.lines))
        throw new Error(
          "The extraction changed or could not be checked. Preview it again, or save edited text as teacher notes.",
        );
      lines = recovered.lines;
      mode = "official";
    }
    const result: SavedTopicNotes = {
      mode,
      sourceUrl: data.url,
      sections: [
        {
          heading: mode === "official" ? "Official source notes" : "Teacher notes",
          kind: "bullets",
          lines,
        },
      ],
    };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = topicNotesKey(scope);
    const { error } = await (supabaseAdmin as any)
      .from("lesson_cache")
      .upsert({ cache_key: key, ...scope, subtopics: "", result });
    if (error) throw new Error("These notes were not saved. Please retry.");
    const stored = await loadTopicNotes(scope);
    if (!stored || JSON.stringify(stored) !== JSON.stringify(result))
      throw new Error("The save could not be confirmed. Keep your draft and retry.");
    return stored;
  });
