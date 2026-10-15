import type { Slide } from "@/lib/generate.functions";
import { cleanSourceNoteLine } from './source-note-quality';

/** Repair only the identifiable NCERT microscopic-resistivity extraction.
 * Other damaged relations are left to the source-grounded generation repair.
 */
export function repairSourceMathLine(line: string): string {
  if (/\$/.test(line)) return line;
  if (
    /using\s+E\s*=\s*V\s*\/\s*l/i.test(line) &&
    /I\s*=\s*ne/i.test(line) &&
    /Ohm[’']?s law/i.test(line) &&
    /ρ|resistivity/i.test(line)
  ) {
    return "Using $E=\\frac{V}{l}$, $I=neAv_d$, and $v_d=\\frac{eE\\tau}{m}$ gives $I=\\frac{ne^2A\\tau}{ml}V$. Comparing with $V=IR$ gives $R=\\frac{ml}{ne^2A\\tau}$ and $\\rho=\\frac{RA}{l}=\\frac{m}{ne^2\\tau}$. Here $n$ is the number density of electrons, $e$ the magnitude of their charge, $m$ their mass, and $\\tau$ the mean relaxation time. This microscopic model applies to an ohmic conductor with constant material conditions.";
  }
  return line;
}

export function repairSourceMathSlide(slide: Slide): Slide {
  const repairLines = (lines: string[]) =>
    lines.flatMap((line) => {
      const fixed = repairSourceMathLine(line);
      if (fixed === line) { const clean=cleanSourceNoteLine(line);return clean?[clean]:[]; }
      return [
        "**Explanation:** The microscopic model reproduces Ohm’s law for a conductor with constant material conditions; Ohm’s law is not valid for every material or field strength.",
        "**Derivation of microscopic resistivity:** $\\rho=\\frac{m}{ne^2\\tau}$",
        "**Derivation step 1:** For a uniform conductor, $E=\\frac{V}{l}$ and $v_d=\\frac{eE\\tau}{m}$, where $v_d$ is the magnitude of drift velocity.",
        "**Derivation step 2:** Substitute in $I=neAv_d$: $I=\\frac{ne^2A\\tau}{ml}V$.",
        "**Derivation step 3:** Compare with $V=IR$: $R=\\frac{V}{I}=\\frac{ml}{ne^2A\\tau}$.",
        "**Derivation step 4:** Use $R=\\frac{\\rho l}{A}$ to obtain $\\rho=\\frac{RA}{l}=\\frac{m}{ne^2\\tau}$.",
        "**Variables:** $n$: number density of electrons; $e$: magnitude of electron charge; $m$: electron mass; $\\tau$: mean relaxation time; $A$: cross-sectional area; $l$: length of conductor.",
        "**SI unit:** Resistivity $\\rho$: $\\Omega\\,\\mathrm{m}$; resistance $R$: $\\Omega$; relaxation time $\\tau$: $\\mathrm{s}$.",
      ];
    });
  return {
    ...slide,
    title: slide.title.replace(/\bOhm'S\b/g, "Ohm’s"),
    bullets: slide.bullets.map(repairSourceMathLine).map(cleanSourceNoteLine).filter(Boolean),
    notes: repairLines(slide.notes),
    sections: slide.sections?.map((section) => ({
      ...section,
      lines: repairLines(section.lines),
    })).filter(section=>section.lines.length),
  };
}
