/**
 * LaTeX-aware notation helpers.
 *
 * Notes lines may contain inline math (`$...$`) and display math (`$$...$$`).
 * These helpers let the rest of the pipeline treat math spans as opaque
 * (never "repaired" or flagged as garbage), and convert LaTeX to readable
 * Unicode when a plain-text surface is needed (PPTX export, SVG diagrams).
 */

export type MathSegment = { type: "text" | "inline" | "block"; value: string };

/** Split a line into text / inline-math / display-math segments. */
export function splitMath(raw: string): MathSegment[] {
  const s = String(raw || "");
  const out: MathSegment[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ type: "text", value: s.slice(last, m.index) });
    out.push(m[1] != null ? { type: "block", value: m[1] } : { type: "inline", value: m[2] ?? "" });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ type: "text", value: s.slice(last) });
  return out.filter((seg) => seg.type !== "text" || seg.value.length > 0);
}

export function hasMath(raw: string): boolean {
  return splitMath(raw).some((s) => s.type !== "text");
}

/** Apply a transform to the non-math parts of a line only. */
export function mapOutsideMath(raw: string, fn: (text: string) => string): string {
  return splitMath(raw)
    .map((seg) =>
      seg.type === "text" ? fn(seg.value) : seg.type === "block" ? `$$${seg.value}$$` : `$${seg.value}$`,
    )
    .join("");
}

const SUP: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "-": "⁻", "+": "⁺", n: "ⁿ", i: "ⁱ",
};
const SUB: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "-": "₋", "+": "₊", a: "ₐ", e: "ₑ", n: "ₙ", o: "ₒ", x: "ₓ",
};

const COMMANDS: Array<[RegExp, string]> = [
  [/\\varepsilon/g, "ε"], [/\\epsilon/g, "ε"], [/\\mu/g, "μ"], [/\\pi/g, "π"],
  [/\\Delta/g, "Δ"], [/\\delta/g, "δ"], [/\\theta/g, "θ"], [/\\phi/g, "φ"],
  [/\\lambda/g, "λ"], [/\\omega/g, "ω"], [/\\Omega/g, "Ω"], [/\\sigma/g, "σ"],
  [/\\rho/g, "ρ"], [/\\alpha/g, "α"], [/\\beta/g, "β"], [/\\gamma/g, "γ"], [/\\eta/g, "η"],
  [/\\times/g, "×"], [/\\cdot/g, "·"], [/\\div/g, "÷"], [/\\pm/g, "±"],
  [/\\rightarrow|\\to/g, "→"], [/\\leftarrow/g, "←"], [/\\rightleftharpoons|\\leftrightharpoons/g, "⇌"],
  [/\\Rightarrow/g, "⇒"], [/\\approx/g, "≈"], [/\\neq/g, "≠"], [/\\leq/g, "≤"], [/\\geq/g, "≥"],
  [/\\propto/g, "∝"], [/\\infty/g, "∞"], [/\\oint/g, "∮"], [/\\int/g, "∫"], [/\\sum/g, "∑"],
  [/\\partial/g, "∂"], [/\\nabla/g, "∇"], [/\\degree|\\circ/g, "°"], [/\\ldots|\\cdots|\\dots/g, "…"],
  [/\\lim/g, "lim"], [/\\log/g, "log"], [/\\ln/g, "ln"], [/\\sin/g, "sin"], [/\\cos/g, "cos"], [/\\tan/g, "tan"],
];

function toScript(body: string, map: Record<string, string>): string | null {
  const chars = [...body];
  if (!chars.length) return null;
  const mapped = chars.map((c) => map[c]);
  return mapped.every(Boolean) ? mapped.join("") : null;
}

/** Convert a LaTeX fragment to the closest readable Unicode plain text. */
export function latexToUnicode(latex: string): string {
  let s = String(latex || "");

  // \frac{a}{b} → (a/b), applied innermost-first.
  for (let i = 0; i < 6; i++) {
    const next = s.replace(/\\(?:d|t)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_m, a, b) => `(${a}/${b})`);
    if (next === s) break;
    s = next;
  }
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)").replace(/\\sqrt\s*(\w)/g, "√$1");
  s = s.replace(/\\(?:mathrm|mathbf|text|mathit|operatorname|boldsymbol|vec|hat)\s*\{([^{}]*)\}/g, "$1");
  s = s.replace(/\\left|\\right/g, "");

  for (const [re, rep] of COMMANDS) s = s.replace(re, rep);

  // Superscripts / subscripts, braced or single-char.
  s = s
    .replace(/\^\s*\{([^{}]*)\}/g, (m, b) => toScript(b, SUP) ?? `^(${b})`)
    .replace(/\^\s*(\S)/g, (m, c) => SUP[c] ?? `^${c}`)
    .replace(/_\s*\{([^{}]*)\}/g, (m, b) => toScript(b, SUB) ?? `_(${b})`)
    .replace(/_\s*(\S)/g, (m, c) => SUB[c] ?? `_${c}`);

  return s
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\\[,;!:> ]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Flatten a whole line (text + math) into readable plain text. */
export function plainMathText(raw: string): string {
  return splitMath(raw)
    .map((seg) => (seg.type === "text" ? seg.value : latexToUnicode(seg.value)))
    .join("")
    .replace(/\s{2,}/g, " ")
    .trim();
}
