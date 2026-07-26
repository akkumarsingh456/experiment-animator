import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function supa() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// Map form values ("10", "Science") to stored values ("Class 10", subject aliases).
const SUBJECT_ALIASES: Record<string, string[]> = {
  Science: ["Science", "Physics", "Chemistry", "Biology", "General"],
  Physics: ["Physics", "Science"],
  Chemistry: ["Chemistry", "Science"],
  Biology: ["Biology", "Science"],
  Mathematics: ["Mathematics"],
  Economics: ["Economics"],
  History: ["History"],
  Geography: ["Geography"],
  English: ["English"],
  Hindi: ["Hindi"],
  Sanskrit: ["Sanskrit"],
  "Political Science": ["Political Science"],
};

function classCandidates(k: string): string[] {
  const t = String(k || "").trim();
  if (!t) return [];
  const num = t.replace(/[^0-9]/g, "");
  return Array.from(new Set([t, `Class ${num}`, num].filter(Boolean)));
}

function subjectCandidates(s: string): string[] {
  const t = String(s || "").trim();
  if (!t) return [];
  return SUBJECT_ALIASES[t] || [t];
}

/** Prettify a raw chapter filename into a readable label. */
function prettifyChapter(raw: string): string {
  let t = String(raw || "").trim();
  t = t.replace(/\.(pdf|PDF)$/, "");
  t = t.replace(/_/g, " ").replace(/-/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  // Title-case tokens except roman numerals & ALL-CAPS acronyms of length <=4.
  t = t
    .split(" ")
    .map((w) => {
      if (/^[IVX]+$/i.test(w)) return w.toUpperCase();
      if (w.length <= 3 && w === w.toUpperCase()) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
  return t;
}

/** Returns distinct chapter names for a given class + subject. */
export const listChapters = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ klass: z.string(), subject: z.string() }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = supa();
    const classes = classCandidates(data.klass);
    const subjects = subjectCandidates(data.subject);
    if (!classes.length || !subjects.length) return { chapters: [] as Array<{ label: string; raw: string }> };

    const { data: rows, error } = await (db as any)
      .from("ncert_books")
      .select("chapter, file_name")
      .in("class", classes)
      .in("subject", subjects)
      .limit(2000);
    if (error) {
      console.warn("listChapters query failed", error.message);
      return { chapters: [] as Array<{ label: string; raw: string }> };
    }

    const seen = new Map<string, { label: string; raw: string }>();
    for (const row of rows || []) {
      const raw = String((row as any).chapter || (row as any).file_name || "").trim();
      if (!raw) continue;
      const label = prettifyChapter(raw);
      const key = label.toLowerCase();
      if (!seen.has(key)) seen.set(key, { label, raw });
    }
    const chapters = Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
    return { chapters };
  });

/** Extract likely subtopic headings from a chapter's chunks.
 *  Regex targets NCERT numbered section titles ("1.2 Some Heading") and
 *  short ALL-CAPS / Title-Case section headers. */
export const listSubtopics = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        klass: z.string(),
        subject: z.string(),
        chapter: z.string().optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = supa();
    const classes = classCandidates(data.klass);
    const subjects = subjectCandidates(data.subject);
    if (!classes.length || !subjects.length) return { subtopics: [] as string[] };

    let q = (db as any)
      .from("ncert_books")
      .select("id, chapter, file_name")
      .in("class", classes)
      .in("subject", subjects)
      .limit(20);
    const { data: books } = await q;
    let filtered = (books || []) as Array<{ id: string; chapter: string; file_name: string }>;
    const wanted = String(data.chapter || "").trim().toLowerCase();
    if (wanted) {
      const w = wanted.replace(/[_\-\s]+/g, " ");
      filtered = filtered.filter((b) => {
        const hay = `${b.chapter || ""} ${b.file_name || ""}`.toLowerCase().replace(/[_\-\s]+/g, " ");
        return hay.includes(w);
      });
    }
    // Fall back to all books if the chapter filter produced nothing.
    const bookIds = (filtered.length ? filtered : (books || [])).slice(0, 6).map((b: any) => b.id);
    if (!bookIds.length) return { subtopics: [] };

    const { data: chunks } = await (db as any)
      .from("ncert_chunks")
      .select("content")
      .in("book_id", bookIds)
      .order("chunk_index", { ascending: true })
      .limit(400);

    const counts = new Map<string, number>();
    const add = (label: string) => {
      const clean = label.replace(/\s+/g, " ").trim();
      if (clean.length < 4 || clean.length > 70) return;
      // Skip lines that are mostly numbers / punctuation / caps-only long strings.
      const alpha = clean.replace(/[^a-zA-Z]/g, "").length;
      if (alpha < 4) return;
      const key = clean.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    };
    const numHeader = /(?:^|\n)\s*(\d+\.\d+(?:\.\d+)?)\s+([A-Z][A-Za-z0-9 ,'\-&/()]{3,68})/g;
    const capHeader = /(?:^|\n)\s*([A-Z][A-Z ]{5,55}[A-Z])(?=\s*\n)/g;
    for (const c of chunks || []) {
      const txt = String((c as any).content || "");
      let m: RegExpExecArray | null;
      while ((m = numHeader.exec(txt))) add(m[2]);
      while ((m = capHeader.exec(txt))) {
        const t = m[1].trim();
        // Filter out obvious noise (all-caps sentences of activities etc).
        if (/^(ACTIVITY|EXAMPLE|EXERCISE|FIGURE|TABLE|CHAPTER|CONTENTS|INDEX|SUMMARY|QUESTIONS?)\b/i.test(t)) continue;
        add(t.charAt(0) + t.slice(1).toLowerCase());
      }
    }
    // Rank by frequency, keep top 30 and prettify.
    const ranked = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([k]) =>
        k
          .split(" ")
          .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
          .join(" "),
      );
    return { subtopics: ranked };
  });
