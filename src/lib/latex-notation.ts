/**
 * LaTeX-aware notation helpers.
 *
 * Notes lines may contain inline math (`$...$`) and display math (`$$...$$`).
 * These helpers let the rest of the pipeline treat math spans as opaque
 * (never "repaired" or flagged as garbage), and convert LaTeX to readable
 * Unicode when a plain-text surface is needed (PPTX export, SVG diagrams).
 */

import katex from "katex";
import "katex/contrib/mhchem";

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

/* ---------------- strict normalisation + validation ---------------- */

/** Balance braces, drop dangling scripts, escape characters KaTeX chokes on. */
export function sanitizeLatex(body: string): string {
  let s = String(body || "");

  // Escape bare specials that are not already escaped.
  s = s.replace(/(?<!\\)([%#&])/g, "\\$1");
  // Dangling scripts: "x^" / "x_" / "^ " with no argument.
  s = s.replace(/([_^])\s*$/g, "").replace(/([_^])\s*(?=[)\]}\s,;])/g, "");
  // Empty script braces.
  s = s.replace(/([_^])\{\s*\}/g, "");
  // \frac with a missing second argument.
  s = s.replace(/\\(d|t)?frac\s*\{([^{}]*)\}\s*(?![{\s])/g, "($2)");
  s = s.replace(/\\(d|t)?frac\s*(?![{\s])/g, "");
  // Balance braces.
  const open = (s.match(/(?<!\\)\{/g) || []).length;
  const close = (s.match(/(?<!\\)\}/g) || []).length;
  if (open > close) s += "}".repeat(open - close);
  else if (close > open) s = "{".repeat(close - open) + s;
  // Balance \left / \right.
  const l = (s.match(/\\left\b/g) || []).length;
  const r = (s.match(/\\right\b/g) || []).length;
  if (l !== r) s = s.replace(/\\(?:left|right)\b/g, "");
  return s.replace(/\s{2,}/g, " ").trim();
}

const validCache = new Map<string, boolean>();

/** True when KaTeX can render the fragment without throwing. */
export function isValidLatex(body: string): boolean {
  const key = body;
  const hit = validCache.get(key);
  if (hit !== undefined) return hit;
  let ok = false;
  try {
    katex.renderToString(body, { throwOnError: true, strict: false, output: "html" });
    ok = true;
  } catch {
    ok = false;
  }
  if (validCache.size > 4000) validCache.clear();
  validCache.set(key, ok);
  return ok;
}

const CHEM = /\b((?:[A-Z][a-z]?\d*){1,6})(\^?\d*[+-]?)(?![A-Za-z0-9_])/g;

/** Subscript chemical species: H2SO4 → H_{2}SO_{4}, SO4^2- → SO_{4}^{2-}. */
function chemSubscripts(s: string): string {
  return s.replace(CHEM, (m) => {
    if (!/[A-Z]/.test(m) || !/\d/.test(m) || /\\/.test(m)) return m;
    const ion=m.match(/^(Li|Na|K|Mg|Ca|Al|Sc|Ti|V|Cr|Mn|Fe|Co|Ni|Cu|Zn|Ag|Cd|Hg|Pb|Sn|La|Ce|Pr|Nd|Pm|Sm|Eu|Gd|Tb|Dy|Ho|Er|Tm|Yb|Lu)([1-8])([+-])$/);
    if(ion)return `${ion[1]}^{${ion[2]}${ion[3]}}`;
    return m
      .replace(/\^(\d+)([+-])?/g, (_x, d, sign) => `^{${d}${sign || ""}}`)
      .replace(/([A-Za-z])(\d+)(?![}])/g, "$1_{$2}")
      .replace(/(?<=[}A-Za-z])([+-])$/, "^{$1}");
  });
}

/** Convert a plain/Unicode math fragment into a valid LaTeX body. */
export function unicodeToLatex(frag: string): string {
  let s = String(frag || "");

  // Unicode scripts → ^{...} / _{...}
  s = s
    .replace(new RegExp(`[${Object.keys(UNI_SUP).join("")}]+`, "g"), (m) =>
      `^{${[...m].map((c) => UNI_SUP[c]).join("")}}`)
    .replace(new RegExp(`[${Object.keys(UNI_SUB).join("")}]+`, "g"), (m) =>
      `_{${[...m].map((c) => UNI_SUB[c]).join("")}}`);

  // Keep an explicitly written ionic magnitude and sign together before the
  // generic exponent formatter can separate them. A following algebraic operand
  // prevents this rule from treating subtraction as an ionic charge.
  s=s.replace(/\b((?:[A-Z][a-z]?\d*)+)\^(\d+)([+-])(?=$|[,;)}\]]|\s*(?:\+|=|\\(?:rightarrow|rightleftharpoons)))/g,'$1^{$2$3}');

  // ASCII helpers before symbol substitution.
  s = s
    .replace(/\bsqrt\s*\(([^()]*)\)/gi, "\\sqrt{$1}")
    .replace(/(\d)\s*\^\s*(-?\d+)/g, "$1^{$2}")
    .replace(/([A-Za-z}])\s*\^\s*(-?\d+)/g, "$1^{$2}")
    .replace(/\bdeg\b|\bdegrees?\b/gi, "^{\\circ}");

  for (const [re, rep] of UNI_CMD) s = s.replace(re, `${rep} `);

  // \sqrt followed by a bare operand needs braces.
  s = s.replace(/\\sqrt\s+([A-Za-z0-9]+)/g, "\\sqrt{$1}");

  s = chemSubscripts(s);

  // a/b → \frac{a}{b}, innermost-first, never inside an existing \frac group.
  for (let i = 0; i < 3; i++) {
    const next = s.replace(
      /(\\?[A-Za-z0-9\\{}^_+\-.]+)\s*\/\s*(\\?[A-Za-z0-9\\{}^_+\-.]+)/g,
      (m, a, b) => (/\\frac/.test(m) ? m : `\\frac{${a}}{${b}}`),
    );
    if (next === s) break;
    s = next;
  }

  // Multi-letter roman words inside math read better upright.
  s = s.replace(/(?<!\\)\b(sin|cos|tan|log|ln|lim|max|min|exp)\b(?!\{)/g, "\\$1 ");

  const out = sanitizeLatex(s.replace(/\s{2,}/g, " ").trim());
  return isValidLatex(out) ? out : sanitizeLatex(out.replace(/\\[a-zA-Z]+\s*$/, ""));
}

/**
 * Normalise any math body (authored LaTeX or Unicode plain text) into a
 * KaTeX-renderable fragment. Returns "" when nothing valid can be produced.
 */
export function normalizeLatex(body: string): string {
  const raw = String(body || "").trim();
  if (!raw) return "";
  if (/\\(?:ce|pu)\s*\{/.test(raw) && isValidLatex(raw)) return raw;
  // Even valid-but-ugly input is rewritten: linear fractions, unbraced
  // scripts, unicode scripts/symbols and unsubscripted chemical species.
  const NEEDS_WORK = /[₀-₉⁰-⁹⁻⁺εμπΔδθφλωΩσραβγηΦ×·÷±∝∞→←⇌⇒≈≠≤≥√∫∮∂∇°½⅓¼]|(?<!\\)\//.test(raw)
    || /[A-Za-z][A-Z]?\d/.test(raw.replace(/\\[a-zA-Z]+/g, ""))
    || /[_^](?!\{)[^\s{]{2,}/.test(raw);
  if (!NEEDS_WORK && isValidLatex(raw)) return raw;
  const conv = unicodeToLatex(raw);
  if (conv && isValidLatex(conv)) return conv;
  const safe = sanitizeLatex(conv || raw);
  return safe && isValidLatex(safe) ? safe : "";
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
    const body = normalizeLatex(s.slice(a, b));
    out += body ? `$${body}$` : s.slice(a, b);
    last = b;
  }
  out += s.slice(last);
  return out.replace(SCI, (m) => {
    if (hasMath(m)) return m;
    const body = normalizeLatex(m);
    return body ? `$${body}$` : m;
  });
}

/**
 * Normalise every math span of a whole line so KaTeX always gets valid input.
 * Invalid fragments degrade to readable Unicode instead of red error text.
 */
export function normalizeLine(raw: string): string {
  return splitMath(String(raw || ""))
    .map((seg) => {
      if (seg.type === "text") return seg.value;
      const body = normalizeLatex(seg.value);
      if (!body) return latexToUnicode(seg.value);
      return seg.type === "block" ? `$$${body}$$` : `$${body}$`;
    })
    .join("");
}
