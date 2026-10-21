import { createHash } from "crypto";
import { z } from "zod";
import { canonicalOfficialRecoveryTopic } from "./official-recovery-scope";
export const topicNotesScope = z.object({
  klass: z.string().regex(/^(9|10|11|12)$/),
  subject: z.string().min(1).max(100),
  chapter: z.string().min(1).max(240),
  topic: z.string().min(1).max(240),
});
export type TopicNotesScope = z.infer<typeof topicNotesScope>;
export const savedTopicNotes = z.object({
  mode: z.enum(["teacher", "official"]),
  sourceUrl: z.string().default(""),
  sections: z
    .array(
      z.object({
        heading: z.string(),
        kind: z.literal("bullets"),
        lines: z.array(z.string().min(1).max(1800)).min(1).max(500),
      }),
    )
    .min(1)
    .max(12),
});
export type SavedTopicNotes = z.infer<typeof savedTopicNotes>;
export function topicNotesKey(input: TopicNotesScope) {
  const scope = canonicalOfficialRecoveryTopic(input) || input;
  return createHash("sha256")
    .update(
      "teacher-topic-notes-v1|" +
        [scope.klass, scope.subject, scope.chapter, scope.topic]
          .map((s) => s.trim().toLowerCase().replace(/\s+/g, " "))
          .join("|"),
    )
    .digest("hex")
    .slice(0, 40);
}
export async function loadTopicNotes(scope: TopicNotesScope): Promise<SavedTopicNotes | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("lesson_cache")
      .select("result")
      .eq("cache_key", topicNotesKey(scope))
      .maybeSingle();
    if (error) return null;
    const parsed = savedTopicNotes.safeParse(data?.result);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
