import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const Input = z.object({
  topic: z.string().min(1),
  subtopics: z.string().optional().default(""),
  klass: z.string().min(1),
  subject: z.string().min(1),
  chapter: z.string().optional().default(""),
});

export type Slide = {
  title: string;
  bullets: string[];
  visual: string; // icon hint or 3d model name
  caption?: string;
};

export type ActivityStep = { step: number; title: string; description: string };
export type Activity = {
  name: string;
  objective: string;
  apparatus: string[];
  steps: ActivityStep[];
  observation: string;
  conclusion: string;
};

export type VideoScene = {
  scene: number;
  title: string;
  duration_s: number;
  visual_prompt: string;
  narration: string;
};

export type GenerationResult = {
  source_books: Array<{ id: string; chapter: string; class: string; subject: string }>;
  context_chars: number;
  slides: Slide[];
  activities: Activity[];
  video: { title: string; scenes: VideoScene[] };
};

function supa() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function score(text: string, terms: string[]) {
  const t = text.toLowerCase();
  let s = 0;
  for (const term of terms) if (term && t.includes(term)) s += term.length;
  return s;
}

async function callLovableAI(systemPrompt: string, userPrompt: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI gateway ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}

export const generateLesson = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<GenerationResult> => {
    const s = supa();
    const terms = [data.topic, ...(data.subtopics || "").split(/[,;\n]/)]
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    // 1. Find matching books filtered by class + subject + optional chapter
    let q = s
      .from("ncert_books")
      .select("id, class, subject, chapter, file_name")
      .ilike("class", `%${data.klass}%`)
      .ilike("subject", `%${data.subject}%`);
    if (data.chapter) q = q.ilike("chapter", `%${data.chapter}%`);
    const { data: books, error: bErr } = await q;
    if (bErr) throw new Error(bErr.message);
    if (!books || books.length === 0) {
      throw new Error(
        `No NCERT PDF found for Class ${data.klass} ${data.subject}${data.chapter ? " ch. " + data.chapter : ""}. Upload it first on the Upload page.`,
      );
    }

    // 2. Fetch chunks ONLY from those books (skip every other file)
    const bookIds = books.map((b) => b.id);
    const { data: chunks, error: cErr } = await s
      .from("ncert_chunks")
      .select("book_id, chunk_index, content")
      .in("book_id", bookIds)
      .limit(2000);
    if (cErr) throw new Error(cErr.message);

    // 3. Rank chunks by topic/subtopic relevance, take top ~25
    const ranked = (chunks ?? [])
      .map((c) => ({ ...c, _s: score(c.content, terms) }))
      .sort((a, b) => b._s - a._s)
      .filter((c) => c._s > 0)
      .slice(0, 25);

    // Fallback to first chunks if nothing matched (still strictly from filtered books)
    const picked = ranked.length > 0 ? ranked : (chunks ?? []).slice(0, 20);
    const context = picked.map((c) => c.content).join("\n---\n").slice(0, 24000);

    // 4. Ask AI for slides + activities + video storyboard
    const system =
      "You are an NCERT-aligned curriculum designer for Indian Class 9-12. " +
      "Use ONLY the provided NCERT excerpts as source of truth. Do NOT invent facts. " +
      "Return strict JSON matching the schema, in clear concise English suitable for the student's class level.";

    const userPrompt = `NCERT EXCERPTS (verbatim, may be noisy from PDF extraction):\n${context}\n\n` +
      `TASK: Build a 10-slide micro-lesson and detect any NCERT "Activity" (experiment) in the excerpts.\n` +
      `Class: ${data.klass}\nSubject: ${data.subject}\nChapter: ${data.chapter || "(any in filtered book)"}\n` +
      `Topic: ${data.topic}\nSubtopics: ${data.subtopics || "(none)"}\n\n` +
      `Return JSON with this exact shape:\n` +
      `{\n` +
      `  "slides": [ { "title": str, "bullets": [str x 2-4], "visual": str (one of: atom, beaker, leaf, magnet, microscope, flask, dna, lightbulb, function, circuit, planet, ruler, prism, heart, brain, bolt), "caption": str } ] // exactly 10\n` +
      `  "activities": [ { "name": str (e.g. "Activity 1.1"), "objective": str, "apparatus": [str], "steps": [ {"step": int, "title": str, "description": str} ], "observation": str, "conclusion": str } ],\n` +
      `  "video": { "title": str, "scenes": [ {"scene": int, "title": str, "duration_s": int, "visual_prompt": str (cinematic 3D scene description, microscopic zoom-ins where relevant), "narration": str (1-2 sentences)} ] x 4-6 }\n` +
      `}\n` +
      `If no explicit Activity is present, return an empty activities array. Every slide bullet must be grounded in the excerpts.`;

    const ai = await callLovableAI(system, userPrompt);

    return {
      source_books: books.map((b) => ({ id: b.id, chapter: b.chapter, class: b.class, subject: b.subject })),
      context_chars: context.length,
      slides: Array.isArray(ai.slides) ? ai.slides.slice(0, 10) : [],
      activities: Array.isArray(ai.activities) ? ai.activities : [],
      video: ai.video ?? { title: data.topic, scenes: [] },
    };
  });
