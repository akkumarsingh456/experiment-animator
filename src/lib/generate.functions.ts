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
  const t = normalizeText(text);
  let s = 0;
  for (const term of terms) {
    const normalized = normalizeText(term);
    if (!normalized) continue;
    if (t.includes(normalized)) {
      s += normalized.length * 4;
      continue;
    }
    const words = normalized.split(" ").filter((w) => w.length > 2);
    const hits = words.filter((word) => t.includes(word)).length;
    if (hits > 0) s += hits * 3 + (hits === words.length ? 12 : 0);
  }
  return s;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(ch|chapter|class|ncert|part|book|vol|volume)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classNumber(value: string) {
  return value.match(/9|10|11|12/)?.[0] ?? normalizeText(value);
}

function subjectAliases(subject: string) {
  const normalized = normalizeText(subject);
  const map: Record<string, string[]> = {
    math: ["math", "mathematics", "ganit"],
    mathematics: ["math", "mathematics", "ganit"],
    physics: ["physics", "bhautiki", "bhautik", "physical"],
    chemistry: ["chemistry", "rasayan", "rasayanik"],
    biology: ["biology", "jeev vigyan", "jiv vigyan"],
    science: ["science", "vigyan"],
    economics: ["economics", "arthashastra"],
    history: ["history", "itihas"],
    geography: ["geography", "bhugol"],
    english: ["english"],
    hindi: ["hindi"],
    sanskrit: ["sanskrit"],
  };
  return map[normalized] ?? [normalized];
}

function subjectMatches(actual: string, requested: string) {
  const a = normalizeText(actual);
  return subjectAliases(requested).some((alias) => a.includes(alias) || alias.includes(a));
}

function buildTerms(data: z.infer<typeof Input>) {
  const raw = [
    data.topic,
    data.chapter,
    ...(data.subtopics || "").split(/[,;\n]/),
  ];
  const terms = new Set<string>();
  for (const item of raw) {
    const n = normalizeText(item || "");
    if (!n) continue;
    terms.add(n);
    for (const word of n.split(" ")) if (word.length > 3 && !/^\d+$/.test(word)) terms.add(word);
  }
  terms.add("activity");
  terms.add("experiment");
  return [...terms];
}

function fallbackSlides(topic: string, context: string): Slide[] {
  const sentences = context
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30)
    .slice(0, 30);
  const visuals = ["lightbulb", "prism", "atom", "ruler", "beaker", "microscope", "bolt", "function", "brain", "sparkles"];
  return Array.from({ length: 10 }, (_, i) => ({
    title: i === 0 ? topic : `${topic} — Key idea ${i}`,
    bullets: sentences.slice(i * 3, i * 3 + 3).length
      ? sentences.slice(i * 3, i * 3 + 3)
      : ["This slide uses only the matching uploaded NCERT text.", "Edit this text after generation if you want a simpler learner version."],
    visual: visuals[i] ?? "lightbulb",
    caption: "Generated from the selected Class, Subject and chapter memory.",
  }));
}

function fallbackActivities(topic: string, context: string): Activity[] {
  const sentences = context
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 35)
    .slice(0, 5);
  return [{
    name: `${topic} — NCERT working guide`,
    objective: `Understand the working of ${topic} using the selected NCERT text.`,
    apparatus: ["NCERT diagram/text", "Notebook", "Teacher-guided classroom demonstration"],
    steps: (sentences.length ? sentences : [
      `Read the matching NCERT passage for ${topic}.`,
      "Identify the main condition, change, observation and result described in the text.",
      "Connect the observation to the NCERT explanation and conclusion.",
    ]).map((sentence, index) => ({
      step: index + 1,
      title: index === 0 ? "Start from NCERT" : `Working step ${index + 1}`,
      description: sentence,
    })),
    observation: "The observation is taken from the filtered NCERT excerpt shown in the generated lesson.",
    conclusion: `The concept of ${topic} is explained only from the matching uploaded NCERT memory.`,
  }];
}

function normalizeActivities(activities: unknown, topic: string, context: string): Activity[] {
  if (!Array.isArray(activities) || activities.length === 0) return fallbackActivities(topic, context);
  return activities.map((activity, index) => {
    const value = activity as Partial<Activity>;
    const steps = Array.isArray(value.steps) && value.steps.length > 0
      ? value.steps.map((step, stepIndex) => {
          const s = step as Partial<ActivityStep>;
          return {
            step: Number(s.step || stepIndex + 1),
            title: String(s.title || `Step ${stepIndex + 1}`),
            description: String(s.description || "Follow this NCERT step."),
          };
        })
      : fallbackActivities(topic, context)[0].steps;
    return {
      name: String(value.name || `${topic} activity ${index + 1}`),
      objective: String(value.objective || `Understand ${topic}.`),
      apparatus: Array.isArray(value.apparatus) ? value.apparatus.map(String) : [],
      steps,
      observation: String(value.observation || "Observe the result described in NCERT."),
      conclusion: String(value.conclusion || `Connect the activity result to ${topic}.`),
    };
  });
}

function normalizeSlides(slides: unknown, topic: string, context: string): Slide[] {
  const fallback = fallbackSlides(topic, context);
  const parsed = Array.isArray(slides)
    ? slides.map((slide, index) => {
        const value = slide as Partial<Slide>;
        return {
          title: String(value.title || fallback[index]?.title || topic),
          bullets: Array.isArray(value.bullets) && value.bullets.length > 0
            ? value.bullets.slice(0, 4).map(String)
            : fallback[index]?.bullets ?? [],
          visual: String(value.visual || fallback[index]?.visual || "lightbulb"),
          caption: value.caption ? String(value.caption) : fallback[index]?.caption,
        };
      })
    : [];
  return [...parsed, ...fallback].slice(0, 10);
}

function fallbackVideo(topic: string, activities: Activity[]): { title: string; scenes: VideoScene[] } {
  const steps = activities.flatMap((a) => a.steps || []);
  const source = steps.length > 0 ? steps.slice(0, 6) : [
    { step: 1, title: "Set up the concept", description: `Introduce ${topic} with the NCERT diagram or apparatus.` },
    { step: 2, title: "Show the change", description: "Animate the ray, particle, object or quantity changing step by step." },
    { step: 3, title: "Reveal the reason", description: "Zoom into the microscopic or conceptual cause behind the observation." },
    { step: 4, title: "Connect result", description: "End with the NCERT observation and conclusion." },
  ];
  return {
    title: `${topic} activity animation`,
    scenes: source.map((step, index) => ({
      scene: index + 1,
      title: step.title,
      duration_s: 5,
      visual_prompt: `Cinematic 3D classroom-lab animation: ${step.description}`,
      narration: step.description,
    })),
  };
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
    const terms = buildTerms(data);

    // 1. Find matching books by the selected class and subject. Many uploaded NCERT
    // files are full books/parts (not one row per chapter), so the chapter field is
    // used for ranking inside those books instead of incorrectly rejecting them.
    const { data: classBooks, error: bErr } = await s
      .from("ncert_books")
      .select("id, class, subject, chapter, file_name")
      .ilike("class", `%${classNumber(data.klass)}%`)
      .limit(100);
    if (bErr) throw new Error(bErr.message);
    const candidates = (classBooks ?? []).filter((book) => subjectMatches(book.subject, data.subject));
    if (candidates.length === 0) {
      throw new Error(
        `No uploaded NCERT book found for Class ${data.klass} ${data.subject}. Check the Library page to confirm the class and subject labels.`,
      );
    }

    // 2. Fetch chunks ONLY from matching Class + Subject books. Other files are skipped.
    const bookIds = candidates.map((b) => b.id);
    const { data: chunks, error: cErr } = await s
      .from("ncert_chunks")
      .select("book_id, chunk_index, content")
      .in("book_id", bookIds)
      .limit(2000);
    if (cErr) throw new Error(cErr.message);

    const chapterTerms = data.chapter ? [normalizeText(data.chapter), ...normalizeText(data.chapter).split(" ")] : [];
    const bookScores = candidates
      .map((book) => {
        const metadataScore = score(`${book.chapter} ${book.file_name}`, [...terms, ...chapterTerms]);
        const chunkScore = (chunks ?? [])
          .filter((chunk) => chunk.book_id === book.id)
          .reduce((sum, chunk) => sum + score(chunk.content, terms), 0);
        return { ...book, _s: metadataScore * 5 + chunkScore };
      })
      .sort((a, b) => b._s - a._s);

    const bestScore = bookScores[0]?._s ?? 0;
    const selectedBooks = bestScore > 0
      ? bookScores.filter((book) => book._s >= Math.max(1, bestScore * 0.45)).slice(0, 2)
      : bookScores.slice(0, 2);
    const selectedIds = new Set(selectedBooks.map((book) => book.id));
    const selectedChunks = (chunks ?? []).filter((chunk) => selectedIds.has(chunk.book_id));

    // 3. Rank chunks by topic/subtopic/chapter relevance and also keep Activity chunks
    // so the experiment guide and animation storyboard are not missed.
    const ranked = selectedChunks
      .map((c) => ({ ...c, _s: score(c.content, terms) }))
      .sort((a, b) => b._s - a._s)
      .filter((c) => c._s > 0);
    const activityChunks = selectedChunks
      .map((c) => ({ ...c, _s: score(c.content, ["activity", "experiment", data.topic]) }))
      .sort((a, b) => b._s - a._s)
      .filter((c) => normalizeText(c.content).includes("activity") || c._s > 12)
      .slice(0, 12);

    // Fallback to first chunks if nothing matched (still strictly from filtered books)
    const pickedMap = new Map<string, string>();
    for (const chunk of [...ranked.slice(0, 28), ...activityChunks]) {
      pickedMap.set(`${chunk.book_id}:${chunk.chunk_index}`, chunk.content);
    }
    const picked = [...pickedMap.values()].length > 0 ? [...pickedMap.values()] : selectedChunks.slice(0, 24).map((c) => c.content);
    const context = picked.join("\n---\n").slice(0, 30000);
    if (!context.trim()) {
      throw new Error(`The matching Class ${data.klass} ${data.subject} PDF was found, but no readable text chunks were saved. Re-ingest that PDF from Upload.`);
    }

    // 4. Ask AI for slides + activities + video storyboard
    const system =
      "You are an NCERT-aligned curriculum designer for Indian Class 9-12. " +
      "Use ONLY the provided NCERT excerpts as source of truth. Do NOT invent facts. " +
      "Return strict JSON matching the schema, in clear concise English suitable for the student's class level.";

    const userPrompt = `NCERT EXCERPTS (verbatim, may be noisy from PDF extraction):\n${context}\n\n` +
      `TASK: Build a 10-slide micro-lesson, extract the NCERT activity/experiment steps, and create a sequential 3D animation storyboard.\n` +
      `Class: ${data.klass}\nSubject: ${data.subject}\nChapter: ${data.chapter || "(any in filtered book)"}\n` +
      `Topic: ${data.topic}\nSubtopics: ${data.subtopics || "(none)"}\n\n` +
      `Return JSON with this exact shape:\n` +
      `{\n` +
      `  "slides": [ { "title": str, "bullets": [str x 2-4], "visual": str (one of: atom, beaker, leaf, magnet, microscope, flask, dna, lightbulb, function, circuit, planet, ruler, prism, heart, brain, bolt), "caption": str } ] // exactly 10\n` +
      `  "activities": [ { "name": str (e.g. "Activity 1.1"), "objective": str, "apparatus": [str], "steps": [ {"step": int, "title": str, "description": str} ], "observation": str, "conclusion": str } ],\n` +
      `  "video": { "title": str, "scenes": [ {"scene": int, "title": str, "duration_s": int, "visual_prompt": str (cinematic 3D scene description, microscopic zoom-ins where relevant), "narration": str (1-2 sentences)} ] x 4-6 }\n` +
      `}\n` +
      `If an explicit NCERT Activity is present anywhere in the excerpts, copy its process step-by-step in simple words without changing the order. ` +
      `If there is no explicit Activity label, still return one "NCERT working guide" activity with sequential steps that explain the correct working of the topic using only the excerpts. ` +
      `Every slide bullet, activity step, and video scene must be grounded in the excerpts.`;

    const ai = await callLovableAI(system, userPrompt);

    const activities = normalizeActivities(ai.activities, data.topic, context);
    const video = ai.video?.scenes?.length ? ai.video : fallbackVideo(data.topic, activities);

    return {
      source_books: selectedBooks.map((b) => ({ id: b.id, chapter: b.chapter, class: b.class, subject: b.subject })),
      context_chars: context.length,
      slides: normalizeSlides(ai.slides, data.topic, context),
      activities,
      video,
    };
  });
