/**
 * LaTeX auto-fix layer.
 *
 * Verification (see `notes-verification.ts`) drops any note line whose math
 * cannot be rendered by KaTeX. Dropping is a last resort: this module first
 * tries to rewrite the broken maths into a valid equivalent —
 *   1. deterministically (normalise → sanitise → re-validate), then
 *   2. with Groq, which re-typesets the line in correct LaTeX.
 * Verification is re-run on the rewritten lines before anything is saved.
 */

import { splitMath, normalizeLatex, isValidLatex, sanitizeLatex, latexToUnicode } from "@/lib/latex-notation";

/** True when at least one math span of the line fails KaTeX after normalisation. */
export function lineHasInvalidLatex(line: string): boolean {
  return splitMath(String(line || "")).some((seg) => {
    if (seg.type === "text") return false;
    const body = normalizeLatex(seg.value);
    return !body || !isValidLatex(body);
  });
}

/**
 * Deterministic repair: rebuild every math span through normalise → sanitise,
 * and fall back to readable Unicode (outside math delimiters) for spans that
 * still refuse to render. Returns null when nothing could be salvaged.
 */
export function localLatexFix(line: string): string | null {
  let repaired = false;
  const out = splitMath(String(line || ""))
    .map((seg) => {
      if (seg.type === "text") return seg.value;
      const body = normalizeLatex(seg.value);
      if (body && isValidLatex(body)) return seg.type === "block" ? `$$${body}$$` : `$${body}$`;
      const safe = sanitizeLatex(seg.value);
      if (safe && isValidLatex(safe)) {
        repaired = true;
        return seg.type === "block" ? `$$${safe}$$` : `$${safe}$`;
      }
      const uni = latexToUnicode(seg.value);
      if (!uni) return "";
      repaired = true;
      return uni;
    })
    .join("")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!out || out.length < 4) return null;
  if (lineHasInvalidLatex(out)) return null;
  return repaired || out !== line ? out : line;
}

/**
 * AI repair: Groq rewrites each broken line so the maths is valid LaTeX with
 * the correct symbols, subscripts and units, keeping the meaning identical.
 * Returns a map of input index → rewritten line (missing keys = unfixable).
 */
export async function aiFixLatex(opts: {
  apiKey?: string;
  subject: string;
  chapter: string;
  lines: string[];
}): Promise<Map<number, string>> {
  const fixed = new Map<number, string>();
  if (!opts.apiKey || opts.lines.length === 0) return fixed;

  const prompt = [
    "You repair broken mathematical / chemical notation in school teaching notes.",
    `Subject: ${opts.subject} | Chapter: ${opts.chapter}`,
    "",
    "For every input line, rewrite it so ALL maths renders in KaTeX:",
    "- Wrap maths in $...$ (inline) or $$...$$ (standalone). Prose stays outside the delimiters.",
    "- Use \\frac{a}{b} (never a/b), \\sqrt{}, \\int, \\sum, \\varepsilon_0, \\Delta, \\times, \\rightarrow, ^{2}, _{2}.",
    "- Chemistry: $H_2SO_4$, $SO_4^{2-}$, $$\\mathrm{CH_4 + 2O_2 \\rightarrow CO_2 + 2H_2O}$$ with states (s)(l)(g)(aq).",
    "- Balance every brace and \\left/\\right pair. Never output bracket soup, repeated '=' runs or stray digits.",
    "- Keep the physical meaning, the numbers and the SI units exactly as given. Do NOT invent new facts.",
    "- Keep any leading **Label:** prefix unchanged.",
    "- If a line is pure extraction garbage with no recoverable meaning, return an empty string for it.",
    "",
    'Return STRICT JSON only: {"lines":[{"index":0,"fixed":"..."}]}',
    "",
    "INPUT LINES:",
    JSON.stringify(opts.lines.map((text, index) => ({ index, text }))).slice(0, 20000),
  ].join("\n");

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.warn("latex-autofix gateway", res.status, (await res.text()).slice(0, 180));
      return fixed;
    }
    const json = (await res.json()) as any;
    const raw = String(json?.choices?.[0]?.message?.content ?? "")
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const parsed = JSON.parse(raw) as { lines?: Array<{ index?: number; fixed?: string }> };
    for (const item of parsed.lines || []) {
      const i = Number(item?.index);
      if (!Number.isFinite(i)) continue;
      const candidate = String(item?.fixed || "").trim();
      if (!candidate) continue;
      const settled = localLatexFix(candidate);
      if (settled && !lineHasInvalidLatex(settled)) fixed.set(i, settled);
    }
  } catch (e) {
    console.warn("latex-autofix failed", e);
  }
  return fixed;
}
