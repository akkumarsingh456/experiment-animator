import { requireLibraryAdmin } from "@/lib/library-auth";
/**
 * Library build queue.
 *
 * Pre-builds Teacher Notes for every chapter in the NCERT syllabus using the
 * LOCKED generation pipeline (`generateLesson`), one small bounded batch per
 * invocation. Progress lives in the database so a build resumes safely and
 * never runs twice at once:
 *
 *  - `lesson_build_jobs`  — one row per class + subject + chapter.
 *  - `lesson_build_state` — the control row ('idle' | 'running' | 'paused' |
 *    'blocked') plus a single-flight lease so two runners cannot overlap.
 *
 * Nothing starts on its own: the teacher presses Start on the Library page.
 */

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { NCERT_SYLLABUS, SYLLABUS_CLASSES } from "@/lib/ncert-syllabus";
import { generateLesson } from "@/lib/generate.functions";

async function db() {
 const {supabaseAdmin}=await import("@/integrations/supabase/client.server");return supabaseAdmin as any;
}

const STATE_ID = "library";
/** Chapters processed per invocation — generation is heavy, keep it small. */
const MAX_BATCH = 2;
/** Single-flight lease length; a crashed runner frees the lock automatically. */
const LEASE_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;

export type BuildState = "idle" | "running" | "paused" | "blocked";

/* ------------------------------------------------------------------ */
/*  Queue building                                                     */
/* ------------------------------------------------------------------ */

/** Add every syllabus chapter (optionally narrowed to one class/subject). */
export const enqueueLibrary = createServerFn({ method: "POST" }).middleware([requireLibraryAdmin])
  .inputValidator((d: unknown) =>
    z
      .object({
        klass: z.string().optional().default(""),
        subject: z.string().optional().default(""),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const rows: Array<{ klass: string; subject: string; chapter: string; subtopics: string }> = [];
    const classes = data.klass ? [data.klass] : SYLLABUS_CLASSES;
    for (const klass of classes) {
      const perClass = NCERT_SYLLABUS[klass] || {};
      for (const [subject, chapters] of Object.entries(perClass)) {
        if (data.subject && subject !== data.subject) continue;
        for (const ch of chapters) {
          rows.push({
            klass,
            subject,
            chapter: ch.chapter,
            subtopics: (ch.subtopics || []).join(", "),
          });
        }
      }
    }
    if (!rows.length) return { queued: 0 };

    const s = await db();
    // Insert in slices; existing (class, subject, chapter) rows are left alone.
    let queued = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const slice = rows.slice(i, i + 200);
      const { error } = await s
        .from("lesson_build_jobs")
        .upsert(slice, { onConflict: "klass,subject,chapter", ignoreDuplicates: true });
      if (!error) queued += slice.length;
    }
    return { queued: rows.length, inserted: queued };
  });

/* ------------------------------------------------------------------ */
/*  Status + controls                                                  */
/* ------------------------------------------------------------------ */

export type BuildStatus = {
  state: BuildState;
  message: string | null;
  counts: { pending: number; running: number; done: number; failed: number; total: number };
  recent: Array<{
    klass: string;
    subject: string;
    chapter: string;
    subtopics: string;
    status: string;
    slides: number;
    error: string | null;
    updated_at: string;
  }>;
};

export const buildStatus = createServerFn({ method: "POST" }).middleware([requireLibraryAdmin])
  .inputValidator((d: unknown) =>
    z.object({ klass: z.string().optional().default("") }).parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<BuildStatus> => {
    const s = await db();
    const { data: st } = await s
      .from("lesson_build_state")
      .select("status, message")
      .eq("id", STATE_ID)
      .maybeSingle();

    const counts = { pending: 0, running: 0, done: 0, failed: 0, total: 0 };
    let q = s.from("lesson_build_jobs").select("status");
    if (data.klass) q = q.eq("klass", data.klass);
    const { data: all } = await q.limit(5000);
    for (const r of all || []) {
      const k = String(r.status) as keyof typeof counts;
      if (k in counts) counts[k] += 1;
      counts.total += 1;
    }

    let rq = s
      .from("lesson_build_jobs")
      .select("klass, subject, chapter, subtopics, status, slides, error, updated_at")
      .order("updated_at", { ascending: false })
      .limit(60);
    if (data.klass) rq = rq.eq("klass", data.klass);
    const { data: recent } = await rq;

    return {
      state: (st?.status as BuildState) || "idle",
      message: st?.message ?? null,
      counts,
      recent: (recent || []) as BuildStatus["recent"],
    };
  });

/** Saved chapters the teacher can open instantly. */
export const listBuiltChapters = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ klass: z.string().optional().default(""), subject: z.string().optional().default("") })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const s = await db();
    let q = s
      .from("lesson_build_jobs")
      .select("klass, subject, chapter, subtopics, slides, updated_at")
      .eq("status", "done")
      .order("klass", { ascending: true })
      .limit(2000);
    if (data.klass) q = q.eq("klass", data.klass);
    if (data.subject) q = q.eq("subject", data.subject);
    const { data: rows } = await q;
    return { chapters: (rows || []) as Array<{
      klass: string; subject: string; chapter: string; subtopics: string; slides: number; updated_at: string;
    }> };
  });

/** Start / pause the build, or reset failed chapters so they can be retried. */
export const controlBuild = createServerFn({ method: "POST" }).middleware([requireLibraryAdmin])
  .inputValidator((d: unknown) =>
    z.object({ action: z.enum(["start", "pause", "retry_failed"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    const s = await db();
    if (data.action === "retry_failed") {
      await s
        .from("lesson_build_jobs")
        .update({ status: "pending", attempts: 0, error: null, updated_at: new Date().toISOString() })
        .eq("status", "failed");
      return { ok: true };
    }
    const status: BuildState = data.action === "start" ? "running" : "paused";
    await s
      .from("lesson_build_state")
      .upsert(
        { id: STATE_ID, status, message: null, lease_until: null, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );
    return { ok: true, state: status };
  });

/* ------------------------------------------------------------------ */
/*  The worker                                                         */
/* ------------------------------------------------------------------ */

function blockedByCredits(msg: string): boolean {
  return /\b(402|403)\b|payment required|insufficient credit|credits|forbidden/i.test(msg);
}

/**
 * Process at most `MAX_BATCH` queued chapters. Exits immediately when the
 * build is paused/blocked or another runner holds the lease.
 */
export const runBuildBatch = createServerFn({ method: "POST" }).middleware([requireLibraryAdmin])
  .inputValidator((d: unknown) =>
    z.object({ limit: z.coerce.number().min(1).max(MAX_BATCH).optional().default(1) }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const s = await db();
    const now = Date.now();

    // 1. Paused-state guard.
    const { data: st } = await s
      .from("lesson_build_state")
      .select("status, lease_until")
      .eq("id", STATE_ID)
      .maybeSingle();
    const state = (st?.status as BuildState) || "idle";
    if (state !== "running") return { ran: 0, state, reason: "not running" as const };

    // 2. Single-flight lease.
    const lease = st?.lease_until ? Date.parse(st.lease_until) : 0;
    if (lease && lease > now) return { ran: 0, state, reason: "locked" as const };
    await s
      .from("lesson_build_state")
      .update({ lease_until: new Date(now + LEASE_MS).toISOString(), updated_at: new Date().toISOString() })
      .eq("id", STATE_ID);

    let ran = 0;
    let done = 0;
    let failed = 0;
    let blocked: string | null = null;

    try {
      const { data: jobs } = await s
        .from("lesson_build_jobs")
        .select("id, klass, subject, chapter, subtopics, attempts")
        .eq("status", "pending")
        .lt("attempts", MAX_ATTEMPTS)
        .order("created_at", { ascending: true })
        .limit(data.limit);

      for (const job of jobs || []) {
        ran += 1;
        const started = Date.now();
        await s
          .from("lesson_build_jobs")
          .update({ status: "running", attempts: job.attempts + 1, updated_at: new Date().toISOString() })
          .eq("id", job.id);
        try {
          const result = await generateLesson({
            data: {
              topic: job.chapter,
              subtopics: job.subtopics,
              klass: job.klass,
              subject: job.subject,
              chapter: job.chapter,
              mode: "chapter",
              nocache: false,
            },
          });
          const slides = (result?.slides || []).length;
          await s
            .from("lesson_build_jobs")
            .update({
              status: slides > 0 ? "done" : "failed",
              slides,
              error: slides > 0 ? null : "No slides produced",
              duration_ms: Date.now() - started,
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);
          if (slides > 0) done += 1;
          else failed += 1;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          failed += 1;
          await s
            .from("lesson_build_jobs")
            .update({
              status: "failed",
              error: msg.slice(0, 400),
              duration_ms: Date.now() - started,
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);
          // Circuit breaker: stop the whole build on credit/permission denials.
          if (blockedByCredits(msg)) {
            blocked = msg.slice(0, 300);
            break;
          }
        }
      }
    } finally {
      await s
        .from("lesson_build_state")
        .update(
          blocked
            ? { status: "blocked", message: blocked, lease_until: null, updated_at: new Date().toISOString() }
            : { lease_until: null, updated_at: new Date().toISOString() },
        )
        .eq("id", STATE_ID);
    }

    return { ran, done, failed, state: blocked ? ("blocked" as BuildState) : ("running" as BuildState), reason: null };
  });
