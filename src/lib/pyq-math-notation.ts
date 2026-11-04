import { chemicalTextNotation } from "./chemical-notation";
import { mapOutsideMath } from "./latex-notation";

/**
 * Presentation-only notation for CBSE PYQ question text: typesets scientific
 * notation, unit powers and chemical species with LaTeX / KaTeX / mhchem.
 * Stored source text is never rewritten and no missing symbol is invented —
 * only unambiguous, complete tokens are typeset.
 */

const SUPERS: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5",
  "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-",
};

/** Unicode superscripts / carets / minus signs → a plain signed exponent. */
function exponentLatex(raw: string): string | null {
  if (!raw) return null;
  const value = [...raw]
    .map((ch) => SUPERS[ch] ?? ch)
    .join("")
    .replace(/[−–]/g, "-")
    .replace(/\s+/g, "");
  return /^[-+]?\d{1,3}$/.test(value) ? value.replace(/^\+/, "") : null;
}

/** Coefficient × 10^exponent, e.g. "1.67 × 10^-27" or "6.022 × 10²³". */
const scientific = /(?<![\w.$])(\d+(?:\.\d+)?)\s*[×x✕]\s*10\s*(?:\^\s*([+−–-]?\d{1,3})|([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+))(?![⁰¹²³⁴⁵⁶⁷⁸⁹])/g;
/** Bare power of ten, e.g. "10^-19" (a caret, so never plain prose). */
const powerOfTen = /(?<![\w.$])10\s*\^\s*([−–-]?\d{1,3})(?![\dA-Za-z])/g;

/** SI units seen in CBSE science papers; lowercase/short tokens only, so
 * sentence words, option letters and section numbers never match. */
const unit = String.raw`mm|cm|km|nm|kg|mg|kJ|MJ|kPa|MPa|kW|MW|mV|kV|mA|kHz|MHz|amu|eV|MeV|min|mol|ms|dm|mL|Pa|kN|kHz|Hz|amu|Ω|µC|mC|L|J|W|V|A|C|N|g|h|s|m`;
const unitSource = `(?:${unit})`;

/** "9.8 m s-2", "kJ mol-1", "kg m^-3" — the minus sign or caret is required,
 * so a bare "m 2" or option text is never turned into a power. */
const unitPair = new RegExp(
  String.raw`(?<![A-Za-z0-9])(${unitSource})\s*(\/|·)\s*(${unitSource})\s*(?:\^\s*([−–-]?\d{1,2})|([−–-])\s*(\d{1,2}))(?![\dA-Za-z])|(?<![A-Za-z0-9])(${unitSource})\s*(?:\^\s*([−–-]?\d{1,2})|([−–-])\s*(\d{1,2}))(?![\dA-Za-z])`,
  "g",
);

function unitPowerLatex(u1: string, sep: string | undefined, u2: string | undefined, exp: string): string {
  const power = `^{${exp}}`;
  if (sep === "/") return String.raw`\mathrm{${u1}/${u2}${power}}`;
  return u2 ? String.raw`\mathrm{${u1}\,${u2}${power}}` : String.raw`\mathrm{${u1}${power}}`;
}

function numericNotation(text: string): string {
  let changed = false;
  let out = text
    .replace(unitPair, (match, u1: string, sep: string | undefined, u2: string | undefined, caretExp?: string, minus?: string, plainExp?: string, u1b?: string, caretExp2?: string, minus2?: string, plainExp2?: string) => {
      const exp = exponentLatex(caretExp ?? (minus && plainExp ? `${minus}${plainExp}` : caretExp2 ?? (minus2 && plainExp2 ? `${minus2}${plainExp2}` : "")));
      if (!exp) return match;
      changed = true;
      return `$${unitPowerLatex(u1 ?? u1b ?? "", sep, u2, exp)}$`;
    })
    .replace(scientific, (match, coef: string, caretExp?: string, supExp?: string) => {
      const exp = exponentLatex(caretExp ?? supExp ?? "");
      if (!exp) return match;
      changed = true;
      return `$${coef}\\times10^{${exp}}$`;
    })
    .replace(powerOfTen, (match, signedExp?: string) => {
      const exp = exponentLatex(signedExp ?? "");
      if (!exp) return match;
      changed = true;
      return `$10^{${exp}}$`;
    });
  if (!changed) return text;
  return out;
}

/** Full question-line notation. Chemistry runs first (it keeps authored math
 * opaque), then scientific/unit powers only outside existing math. */
export function pyqNotation(line: string): string {
  if (!line) return line;
  return mapOutsideMath(chemicalTextNotation(line), numericNotation);
}
