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

/* ---------------- Unicode → LaTeX auto-wrapping ---------------- */

const UNI_SUP: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7",
  "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+", "ⁿ": "n", "ⁱ": "i",
};
const UNI_SUB: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7",
  "₈": "8", "₉": "9", "₋": "-", "₊": "+", "ₐ": "a", "ₑ": "e", "ₙ": "n", "ₒ": "o", "ₓ": "x",
};
const UNI_CMD: Array<[RegExp, string]> = [
  [/ε/g, "\\varepsilon"], [/μ/g, "\\mu"], [/π/g, "\\pi"], [/Δ/g, "\\Delta"], [/δ/g, "\\delta"],
  [/θ/g, "\\theta"], [/φ/g, "\\phi"], [/λ/g, "\\lambda"], [/ω/g, "\\omega"], [/Ω/g, "\\Omega"],
  [/σ/g, "\\sigma"], [/ρ/g, "\\rho"], [/α/g, "\\alpha"], [/β/g, "\\beta"], [/γ/g, "\\gamma"],
  [/η/g, "\\eta"], [/Φ/g, "\\Phi"], [/Σ/g, "\\sum"], [/∑/g, "\\sum"], [/∫/g, "\\int"],
  [/∮/g, "\\oint"], [/∂/g, "\\partial"], [/∇/g, "\\nabla"], [/√/g, "\\sqrt"],
  [/×/g, "\\times"], [/·/g, "\\cdot"], [/÷/g, "\\div"], [/±/g, "\\pm"], [/∝/g, "\\propto"],
  [/∞/g, "\\infty"], [/→/g, "\\rightarrow"], [/←/g, "\\leftarrow"], [/⇌/g, "\\rightleftharpoons"],
  [/⇒/g, "\\Rightarrow"], [/≈/g, "\\approx"], [/≠/g, "\\neq"], [/≤/g, "\\leq"], [/≥/g, "\\geq"],
  [/°/g, "^{\\circ}"], [/½/g, "\\frac{1}{2}"], [/⅓/g, "\\frac{1}{3}"], [/¼/g, "\\frac{1}{4}"],
];

/** Convert a plain/Unicode math fragment into a LaTeX body. */
export function unicodeToLatex(frag: string): string {
  let s = String(frag || "");
  // Unicode scripts → ^{...} / _{...}
  s = s
    .replace(new RegExp(`[${Object.keys(UNI_SUP).join("")}]+`, "g"), (m) =>
      `^{${[...m].map((c) => UNI_SUP[c]).join("")}}`)
    .replace(new RegExp(`[${Object.keys(UNI_SUB).join("")}]+`, "g"), (m) =>
      `_{${[...m].map((c) => UNI_SUB[c]).join("")}}`);
  for (const [re, rep] of UNI_CMD) s = s.replace(re, `${rep} `);
  // a/b → \frac{a}{b} for simple operands
  s = s.replace(/([A-Za-z0-9\\{}^_]+)\s*\/\s*([A-Za-z0-9\\{}^_]+)/g, "\\frac{$1}{$2}");
  return s.replace(/\s{2,}/g, " ").trim();
}

const SYM = "εμπΔδθφλωΩσραβγηΦ";
const OPS = "=∝≈≤≥+\\-*/×÷·^_()√";
const isMathToken = (t: string) =>
  !!t &&
  !/^[A-Za-z]{4,}$/.test(t) &&
  new RegExp(`^[A-Za-z0-9${SYM}${OPS}₀-₉⁰-⁹⁻⁺°½.,]+$`).test(t);

/** Grab the mathematical span starting at an operator, stopping at prose. */
function mathSpans(s: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  const start = new RegExp(`[A-Za-z${SYM}][A-Za-z0-9₀-₉⁰-⁹_^]*\\s*(?:=|∝|≈|≤|≥)`, "g");
  let m: RegExpExecArray | null;
  while ((m = start.exec(s))) {
    let end = m.index + m[0].length;
    // consume mathy tokens after the operator
    while (end < s.length) {
      const rest = s.slice(end);
      const tok = /^\s*([^\s]+)/.exec(rest);
      if (!tok) break;
      const raw = tok[1].replace(/[.,;:]+$/, "");
      if (!isMathToken(raw)) break;
      end += tok[0].length - (tok[1].length - raw.length);
      if (/[.,;:]$/.test(tok[1])) break;
    }
    if (end > m.index + m[0].length) spans.push([m.index, end]);
    start.lastIndex = end;
  }
  return spans;
}

const SCI = /\d[\d.]*\s*×\s*10\s*[⁻⁺^-]?\s*[⁰-⁹\d]+/g;

const MATH_CANDIDATE =
  /(?:[A-Za-zΦεμπΔθλσρ][A-Za-z0-9₀-₉⁰-⁹_^]*\s*(?:=|∝|≈|≤|≥)\s*[^,;.()]{1,70})|(?:\d[\d.,]*\s*×\s*10[⁻⁺]?[⁰-⁹]+(?:\s*[A-Za-z⁻¹²³\s]{0,12})?)/g;

/**
 * Wrap the mathematical parts of a plain-text line in `$...$` LaTeX so KaTeX
 * renders them. Lines that already contain authored LaTeX are left untouched.
 */
export function autoLatex(raw: string): string {
  const s = String(raw || "");
  if (!s || hasMath(s)) return s;
  let out = "";
  let last = 0;
  for (const [a, b] of mathSpans(s)) {
    if (a < last) continue;
    out += s.slice(last, a);
    const body = unicodeToLatex(s.slice(a, b));
    out += body ? `$${body}$` : s.slice(a, b);
    last = b;
  }
  out += s.slice(last);
  return out.replace(SCI, (m) => (hasMath(m) ? m : `$${unicodeToLatex(m)}$`));
}
