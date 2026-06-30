import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function hashKey(parts: Array<string | undefined | null>) {
  const norm = parts
    .map((p) => (p ?? "").toString().trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
  return createHash("sha256").update(norm).digest("hex").slice(0, 40);
}

function cacheSupa() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const generateSlideImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().default(""),
        bullets: z.array(z.string()).default([]),
        caption: z.string().optional().default(""),
        subject: z.string().optional().default(""),
        klass: z.string().optional().default(""),
        visual_prompt: z.string().optional().default(""),
        grounding: z.string().optional().default(""),
        nocache: z.boolean().optional().default(false),
        cacheOnly: z.boolean().optional().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    // Cache lookup — same (class, subject, title, visual_prompt) returns instantly.
    const cacheKey = hashKey([
      "img-v1",
      data.klass,
      data.subject,
      data.title,
      data.visual_prompt,
      (data.bullets || []).join(" "),
    ]);
    const db = cacheSupa();
    const startedAt = Date.now();
    const auditBase = {
      cache_key: cacheKey,
      klass: String(data.klass || ""),
      subject: String(data.subject || ""),
      title: String(data.title || ""),
      visual_prompt: String(data.visual_prompt || ""),
      grounding: String(data.grounding || "").slice(0, 4000),
      bullets: (data.bullets || []).join(" | ").slice(0, 2000),
      caption: String(data.caption || "").slice(0, 1000),
      nocache: !!data.nocache,
    };
    const logAudit = async (extra: Record<string, unknown>) => {
      try {
        await (db as any).from("slide_image_audit").insert({
          ...auditBase,
          ...extra,
          duration_ms: Date.now() - startedAt,
        });
      } catch (e) { console.warn("slide_image_audit write failed", e); }
    };

    if (!data.nocache) {
      try {
        const { data: hit } = await (db as any)
          .from("slide_image_cache")
          .select("image_url")
          .eq("cache_key", cacheKey)
          .maybeSingle();
        if (hit?.image_url) {
          await logAudit({ status: "cache_hit", cached: true, image_url: hit.image_url });
          return { url: hit.image_url as string, cached: true };
        }
      } catch { /* ignore cache miss */ }
    }

    // Credit-saving guard: caller asked for cache-only — never spend credits on
    // a fresh image generation. Returns an empty url so the UI can show a
    // "Generate diagram" button instead.
    if (data.cacheOnly) {
      await logAudit({ status: "cache_miss_skipped", cached: false });
      return { url: "", cached: false, skipped: true };
    }


    const grounding = (data.grounding || "").slice(0, 1500);
    const prompt =
      `Create an accurate, exam-correct 2D textbook diagram for an Indian NCERT Class ${data.klass || "9-12"} ${data.subject || ""} lesson.\n\n` +
      `Slide title: ${data.title}\n` +
      `Key bullets to illustrate visually (do NOT add unrelated objects):\n${(data.bullets || []).map((b, i) => `${i + 1}. ${b}`).join("\n")}\n` +
      (data.caption ? `Caption: ${data.caption}\n` : "") +
      (data.visual_prompt ? `\nWhat to draw (NCERT-aligned scene description): ${data.visual_prompt}\n` : "") +
      (grounding ? `\nGROUND TRUTH (verbatim NCERT excerpt — every symbol, formula, structure and label MUST match this and standard NCERT conventions):\n"""${grounding}"""\n` : "") +
      `\nHARD REQUIREMENTS:\n` +
      `- Use only scientifically correct chemical formulas, equations, units, arrows, labels and structures exactly as in NCERT.\n` +
      `- Spell every label, element symbol, variable and SI unit correctly; double check before drawing.\n` +
      `- No imagined or decorative facts. If unsure about a symbol, omit it instead of guessing.\n` +
      `- Flat 2D vector textbook-diagram style, soft pastel palette on light cream background, crisp black labels, clear arrows where helpful.\n` +
      `- Minimal extra text. No photorealism, no watermark, no UI chrome, no human figures unless the topic requires them.`;
    async function call() {
      return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });
    }
    let res: Response;
    try {
      res = await call();
      if (!res.ok && (res.status === 429 || res.status >= 500)) {
        await new Promise((r) => setTimeout(r, 1200));
        res = await call();
      }
      if (!res.ok) {
        const errTxt = (await res.text()).slice(0, 200);
        await logAudit({ status: "error", cached: false, error: `gateway ${res.status}: ${errTxt}` });
        throw new Error(`Image gateway ${res.status}: ${errTxt}`);
      }
    } catch (e: any) {
      if (!String(e?.message || "").startsWith("Image gateway")) {
        await logAudit({ status: "error", cached: false, error: String(e?.message || e).slice(0, 500) });
      }
      throw e;
    }
    const j = await res.json();
    const msg = j?.choices?.[0]?.message;
    const url: string | undefined =
      msg?.images?.[0]?.image_url?.url ||
      msg?.images?.[0]?.url ||
      (typeof msg?.content === "string"
        ? msg.content.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/)?.[0]
        : undefined);
    if (!url) {
      await logAudit({ status: "error", cached: false, error: "No image returned from gateway" });
      throw new Error("No image returned from gateway");
    }

    // Save to cache (best-effort, don't fail generation on cache write errors)
    try {
      await (db as any).from("slide_image_cache").upsert({
        cache_key: cacheKey,
        klass: String(data.klass || ""),
        subject: String(data.subject || ""),
        title: String(data.title || ""),
        visual_prompt: String(data.visual_prompt || ""),
        image_url: url,
      });
    } catch (e) { console.warn("slide image cache write failed", e); }

    await logAudit({ status: "success", cached: false, image_url: url });
    return { url, cached: false };
  });


const Input = z.object({
  topic: z.coerce.string().min(1),
  subtopics: z.coerce.string().optional().default(""),
  klass: z.coerce.string().min(1),
  subject: z.coerce.string().min(1),
  chapter: z.coerce.string().optional().default(""),
  nocache: z.coerce.boolean().optional().default(false),
});

export type Slide = {
  title: string;
  bullets: string[];          // 5-7 dense, NCERT-grounded bullets
  notes: string[];            // 2-4 extra explanatory notes pulled from NCERT
  key_terms: { term: string; meaning: string }[]; // 2-4 vocabulary items
  ncert_quote?: string;       // short verbatim NCERT line for credibility
  visual: string;             // icon hint
  visual_prompt?: string;     // detailed scene description for 2D diagram
  grounding?: string;         // NCERT excerpt used to verify the image
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

export type ActivityMatch = {
  book_id: string;
  chapter: string;
  file_name: string;
  chunk_index: number;
  excerpt: string;
  activity_id: string | null;
  confidence: number; // 0-100
};

export type GenerationResult = {
  source_books: Array<{ id: string; chapter: string; class: string; subject: string }>;
  context_chars: number;
  slides: Slide[];
  activities: Activity[];
  activity_matches: ActivityMatch[];
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

function subjectAliases(subject: string, klass?: string) {
  const normalized = normalizeText(subject);
  const cls = klass ? classNumber(klass) : "";
  const isJunior = cls === "9" || cls === "10";
  const map: Record<string, string[]> = {
    math: ["math", "mathematics", "ganit"],
    mathematics: ["math", "mathematics", "ganit"],
    physics: isJunior ? ["physics", "science", "vigyan", "bhautiki"] : ["physics", "bhautiki", "bhautik", "physical"],
    chemistry: isJunior ? ["chemistry", "science", "vigyan", "rasayan"] : ["chemistry", "rasayan", "rasayanik"],
    biology: isJunior ? ["biology", "science", "vigyan", "jeev"] : ["biology", "jeev vigyan", "jiv vigyan"],
    science: ["science", "vigyan", "physics", "chemistry", "biology"],
    economics: ["economics", "arthashastra"],
    history: ["history", "itihas"],
    geography: ["geography", "bhugol"],
    english: ["english"],
    hindi: ["hindi"],
    sanskrit: ["sanskrit"],
  };
  return map[normalized] ?? [normalized];
}

function subjectMatches(actual: string, requested: string, klass?: string) {
  const a = normalizeText(actual);
  return subjectAliases(requested, klass).some((alias) => a.includes(alias) || alias.includes(a));
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
  return Array.from({ length: 10 }, (_, i) => {
    const bs = sentences.slice(i * 4, i * 4 + 6);
    return {
      title: i === 0 ? topic : `${topic} — Key idea ${i}`,
      bullets: bs.length ? bs : [
        "This slide uses only the matching uploaded NCERT text.",
        "Edit this text after generation if you want a simpler learner version.",
      ],
      notes: sentences.slice(30 + i * 2, 30 + i * 2 + 2),
      key_terms: [],
      visual: visuals[i] ?? "lightbulb",
      visual_prompt: `Clean 2D NCERT-style diagram illustrating: ${topic} — key idea ${i}.`,
      grounding: sentences.slice(i * 4, i * 4 + 6).join(" "),
      caption: "Generated from the selected Class, Subject and chapter memory.",
    };
  });
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
  const parsed: Slide[] = Array.isArray(slides)
    ? slides.map((slide, index) => {
        const v = slide as Partial<Slide> & { key_terms?: unknown; notes?: unknown };
        const bullets = Array.isArray(v.bullets) && v.bullets.length > 0
          ? v.bullets.slice(0, 7).map(String)
          : fallback[index]?.bullets ?? [];
        const notes = Array.isArray(v.notes)
          ? (v.notes as unknown[]).slice(0, 4).map(String)
          : fallback[index]?.notes ?? [];
        const key_terms = Array.isArray(v.key_terms)
          ? (v.key_terms as Array<{ term?: unknown; meaning?: unknown }>)
              .slice(0, 4)
              .map((t) => ({ term: String(t?.term ?? ""), meaning: String(t?.meaning ?? "") }))
              .filter((t) => t.term)
          : [];
        return {
          title: String(v.title || fallback[index]?.title || topic),
          bullets,
          notes,
          key_terms,
          ncert_quote: v.ncert_quote ? String(v.ncert_quote) : undefined,
          visual: String(v.visual || fallback[index]?.visual || "lightbulb"),
          visual_prompt: v.visual_prompt ? String(v.visual_prompt) : fallback[index]?.visual_prompt,
          grounding: v.grounding ? String(v.grounding) : fallback[index]?.grounding,
          caption: v.caption ? String(v.caption) : fallback[index]?.caption,
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
    // Lesson cache — same (class, subject, chapter, topic, subtopics) returns instantly.
    const lessonKey = hashKey([
      "lesson-v1",
      data.klass,
      data.subject,
      data.chapter,
      data.topic,
      data.subtopics,
    ]);
    const cdb = cacheSupa();
    if (!data.nocache) {
      try {
        const { data: hit } = await (cdb as any)
          .from("lesson_cache")
          .select("result")
          .eq("cache_key", lessonKey)
          .maybeSingle();
        if (hit?.result) return hit.result as GenerationResult;
      } catch { /* miss */ }
    }

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
    let candidates = (classBooks ?? []).filter((book) => subjectMatches(book.subject, data.subject, data.klass));

    // Fallback 1: same class, ignore subject filter and rank by topic later
    if (candidates.length === 0 && (classBooks?.length ?? 0) > 0) {
      candidates = classBooks!;
    }

    // Fallback 2: cross-class search — the requested topic may live in another class
    // (e.g. "Electric Charges and Fields" is Class 12 Physics, not Class 10).
    if (candidates.length === 0) {
      const { data: allBooks } = await s
        .from("ncert_books")
        .select("id, class, subject, chapter, file_name")
        .limit(500);
      const pool = (allBooks ?? []).filter((b) => subjectMatches(b.subject, data.subject, b.class));
      candidates = pool.length > 0 ? pool : (allBooks ?? []);
    }

    if (candidates.length === 0) {
      throw new Error(
        `No uploaded NCERT books found in the library. Please upload PDFs from the Upload page.`,
      );
    }


    // 2. Pre-rank by metadata. Keep ALL class+subject matches in play so every
    // uploaded NCERT PDF for the selected Class & Subject is readable by the
    // generator. We only cap when we had to widen the search cross-class.
    const chapterTermsPre = data.chapter ? [normalizeText(data.chapter), ...normalizeText(data.chapter).split(" ")] : [];
    const preRanked = candidates
      .map((b) => ({ b, m: score(`${b.chapter} ${b.file_name} ${b.subject} ${b.class}`, [...terms, ...chapterTermsPre]) }))
      .sort((a, z) => z.m - a.m);
    const cap = candidates.length <= 20 ? candidates.length : 20;
    const topCandidates = preRanked.slice(0, cap).map((x) => x.b);
    candidates = topCandidates;

    // 3. Fetch chunks PER BOOK in parallel so a single global LIMIT cannot
    // silently drop entire PDFs from the search context. Each book contributes
    // up to 1200 chunks (covers full NCERT books).
    const perBookChunks = await Promise.all(
      topCandidates.map((b) =>
        s
          .from("ncert_chunks")
          .select("book_id, chunk_index, content")
          .eq("book_id", b.id)
          .order("chunk_index", { ascending: true })
          .limit(1200)
          .then((r) => r.data ?? []),
      ),
    );
    const chunks = perBookChunks.flat();


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

    let bestScore = bookScores[0]?._s ?? 0;
    let selectedBooks = bestScore > 0
      ? bookScores.filter((book) => book._s >= Math.max(1, bestScore * 0.45)).slice(0, 2)
      : bookScores.slice(0, 2);
    let selectedIds = new Set(selectedBooks.map((book) => book.id));
    let selectedChunks = (chunks ?? []).filter((chunk) => selectedIds.has(chunk.book_id));

    // Cross-class rescue: if no chunk in the current candidates actually matches
    // the topic terms, search across ALL classes and subjects by topic relevance.
    const hasTopicalHit = (chunks ?? []).some((c) => score(c.content, terms) > 8);
    if (!hasTopicalHit) {
      const { data: allBooks2 } = await s
        .from("ncert_books")
        .select("id, class, subject, chapter, file_name")
        .limit(500);
      const ranked2 = (allBooks2 ?? [])
        .map((b) => ({ b, m: score(`${b.chapter} ${b.file_name} ${b.subject} ${b.class}`, [...terms, ...chapterTerms]) }))
        .sort((a, z) => z.m - a.m)
        .slice(0, 10)
        .map((x) => x.b);
      if (ranked2.length > 0) {
        const { data: chunks2 } = await s
          .from("ncert_chunks")
          .select("book_id, chunk_index, content")
          .in("book_id", ranked2.map((b) => b.id))
          .limit(3000);
        const scored2 = ranked2.map((book) => {
          const meta = score(`${book.chapter} ${book.file_name}`, [...terms, ...chapterTerms]);
          const chunkS = (chunks2 ?? []).filter((c) => c.book_id === book.id).reduce((s, c) => s + score(c.content, terms), 0);
          return { ...book, _s: meta * 5 + chunkS };
        }).sort((a, b) => b._s - a._s);
        if ((scored2[0]?._s ?? 0) > bestScore) {
          candidates = ranked2;
          bestScore = scored2[0]._s;
          selectedBooks = scored2.filter((b) => b._s >= Math.max(1, bestScore * 0.45)).slice(0, 2);
          selectedIds = new Set(selectedBooks.map((b) => b.id));
          selectedChunks = (chunks2 ?? []).filter((c) => selectedIds.has(c.book_id));
        }
      }
    }


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
      `  "slides": [ {\n` +
      `      "title": str (concise, exam-style),\n` +
      `      "bullets": [str x 5-7] — DENSE, fact-rich, each 12-22 words, taken/paraphrased from the excerpts. NO filler, NO blank-sounding bullets,\n` +
      `      "notes": [str x 2-4] — extra NCERT notes / extensions / common-mistake warnings that did not fit in bullets,\n` +
      `      "key_terms": [ {"term": str, "meaning": str} x 2-4 ] — vocabulary defined exactly as in NCERT,\n` +
      `      "ncert_quote": str (one short verbatim line from the excerpts that backs this slide),\n` +
      `      "visual": str (one of: atom, beaker, leaf, magnet, microscope, flask, dna, lightbulb, function, circuit, planet, ruler, prism, heart, brain, bolt),\n` +
      `      "visual_prompt": str — describe EXACTLY what the 2D diagram must show (objects, labels, formulas, arrows, structure, units) so a separate image model can draw it correctly. List every chemical formula, equation, structure or symbol that must appear, spelled exactly as in NCERT,\n` +
      `      "grounding": str — paste the 1-3 sentence NCERT excerpt the diagram must agree with,\n` +
      `      "caption": str\n` +
      `  } ] // exactly 10 slides, every slide dense and informative — no empty slots,\n` +
      `  "activities": [ { "name": str (e.g. "Activity 1.1"), "objective": str, "apparatus": [str], "steps": [ {"step": int, "title": str, "description": str} ], "observation": str, "conclusion": str } ],\n` +
      `  "video": { "title": str, "scenes": [ {"scene": int, "title": str, "duration_s": int, "visual_prompt": str (cinematic 3D scene description, microscopic zoom-ins where relevant), "narration": str (1-2 sentences)} ] x 4-6 }\n` +
      `}\n` +
      `Slide rules: 5-7 bullets per slide, no slide may feel empty or repetitive, every fact must come from the excerpts. Spell every chemical formula, symbol, SI unit and proper name exactly as NCERT does. For each slide, the "visual_prompt" must clearly describe the structure/diagram to draw so it cannot be mis-drawn; if you are not sure of a structure, prefer a simpler accurate diagram over an invented one.\n` +
      `If an explicit NCERT Activity is present anywhere in the excerpts, copy its process step-by-step in simple words without changing the order. ` +
      `If there is no explicit Activity label, still return one "NCERT working guide" activity with sequential steps that explain the correct working of the topic using only the excerpts. ` +
      `Every slide bullet, note, activity step and video scene must be grounded in the excerpts.`;

    const ai = await callLovableAI(system, userPrompt);

    const activities = normalizeActivities(ai.activities, data.topic, context);
    const video = ai.video?.scenes?.length ? ai.video : fallbackVideo(data.topic, activities);

    // Build verifiable activity matches with confidence so the user can confirm
    // the correct NCERT activity was matched before the PPT and video are used.
    const bookMeta = new Map(selectedBooks.map((b) => [b.id, b]));
    const maxRaw = Math.max(1, ...activityChunks.map((c) => c._s));
    const matchPool = activityChunks.length > 0
      ? activityChunks
      : ranked.slice(0, 5).map((c) => ({ ...c, _s: c._s }));
    const activity_matches: ActivityMatch[] = matchPool.slice(0, 6).map((c) => {
      const text = String(c.content || "");
      const idMatch = text.match(/Activity\s+\d+(?:\.\d+)?/i);
      const lower = text.toLowerCase();
      const idx = idMatch ? Math.max(0, lower.indexOf(idMatch[0].toLowerCase()) - 40) : 0;
      const excerpt = text.slice(idx, idx + 480).replace(/\s+/g, " ").trim();
      const book = bookMeta.get(c.book_id);
      return {
        book_id: c.book_id,
        chapter: book?.chapter || "",
        file_name: book?.file_name || "",
        chunk_index: c.chunk_index,
        excerpt,
        activity_id: idMatch ? idMatch[0] : null,
        confidence: Math.min(100, Math.round((c._s / maxRaw) * 100)),
      };
    });

    const out: GenerationResult = {
      source_books: selectedBooks.map((b) => ({ id: b.id, chapter: b.chapter, class: b.class, subject: b.subject })),
      context_chars: context.length,
      slides: normalizeSlides(ai.slides, data.topic, context),
      activities,
      activity_matches,
      video,
    };

    // Save lesson cache (best-effort) so repeat regenerations are instant.
    try {
      await (cdb as any).from("lesson_cache").upsert({
        cache_key: lessonKey,
        klass: String(data.klass || ""),
        subject: String(data.subject || ""),
        chapter: String(data.chapter || ""),
        topic: String(data.topic || ""),
        subtopics: String(data.subtopics || ""),
        result: out,
      });
    } catch (e) { console.warn("lesson cache write failed", e); }

    return out;
  });
