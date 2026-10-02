/**
 * Pen & paper → LaTeX.
 *
 * A teacher writes a formula/note by hand on the slide canvas (or types it).
 * Groq Vision reads it and returns correct LaTeX so it renders through KaTeX in the
 * blank space of the slide. The request runs server-side with a Groq API key.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().max(4000).optional(),
  imageDataUrl: z.string().max(8_000_000).optional(),
  subject: z.string().max(60).optional(),
  topic: z.string().max(200).optional(),
});

export type PenLatexResult = { lines: string[]; error?: string };

export const penToLatex = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<PenLatexResult> => {
    const apiKey = process.env["GROQ_API_KEY"];
    if (!apiKey) return { lines: [], error: "AI is not configured." };
    if (!data.text?.trim() && !data.imageDataUrl) return { lines: [], error: "Nothing to read." };

    const prompt = [
      "You are a maths/science typesetting engine for NCERT teacher slides.",
      "The input is a teacher's handwritten or typed formula / short note.",
      "Transcribe it EXACTLY and rewrite every mathematical or chemical expression as valid LaTeX.",
      "",
      "RULES:",
      "- Wrap inline maths in $...$ (never \\( \\)). Use \\frac{}{} for every division, ^{} and _{} for scripts.",
      "- Chemistry: proper subscripts and ionic superscripts, e.g. $H_{2}SO_{4}$, $PO_{4}^{3-}$, arrows \\rightarrow / \\rightleftharpoons.",
      "- Physics/Maths: SI units in \\mathrm{}, e.g. $v = 3\\ \\mathrm{m\\,s^{-1}}$. Greek letters as \\varepsilon, \\mu, \\Delta.",
      "- Prefix a label in **bold** when the line is a definition/formula/unit, e.g. '**Formula** $F = ma$'.",
      "- Keep the teacher's wording; do NOT invent extra content, examples or explanations.",
      "- Output one item per written line, max 10 items. Drop anything unreadable instead of guessing.",
      data.subject ? `Subject: ${data.subject}.` : "",
      data.topic ? `Topic: ${data.topic}.` : "",
      "",
      'Return STRICT JSON only: {"lines":["**Formula** $F = ma$", "..."]}',
      data.text?.trim() ? `TYPED INPUT:\n${data.text.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const content: unknown[] = [{ type: "text", text: prompt }];
    if (data.imageDataUrl) content.push({ type: "image_url", image_url: { url: data.imageDataUrl } });

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          messages: [{ role: "user", content }],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        const body = (await res.text()).slice(0, 200);
        if (res.status === 429) return { lines: [], error: "AI is busy — try again in a moment." };
        if (res.status === 402) return { lines: [], error: "AI credits exhausted." };
        return { lines: [], error: `AI error ${res.status}: ${body}` };
      }
      const json = (await res.json()) as any;
      const raw = String(json?.choices?.[0]?.message?.content ?? "")
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/, "")
        .trim();
      const parsed = JSON.parse(raw) as { lines?: unknown };
      const lines = (Array.isArray(parsed.lines) ? parsed.lines : [])
        .map((l) => String(l ?? "").replace(/\s{2,}/g, " ").trim())
        .filter((l) => l.length > 1)
        .slice(0, 10);
      return lines.length ? { lines } : { lines: [], error: "Could not read the writing — try again." };
    } catch (e) {
      return { lines: [], error: e instanceof Error ? e.message : "AI request failed." };
    }
  });
