import type { Slide } from "@/lib/generate.functions";
import type { NoteSection } from "@/lib/ncert-teacher-notes";
import { mapOutsideMath } from "@/lib/latex-notation";

export const SOURCE_TABLE_HEADING = "Source table — original extracted entries";
const lanthanoids = /\b(?:Lanthanum|Cerium|Praseodymium|Neodymium|Promethium|Samarium|Europium|Gadolinium|Terbium|Dysprosium|Holmium|Erbium|Thulium|Ytterbium|Lutetium)\b/g;

/** Detect collapsed f-block tables that the older d-block-only detector missed. */
export function isCollapsedChemistryTable(line: string): boolean {
  const names = (line.match(lanthanoids) || []).length;
  const ions = (line.match(/\b(?:La|Ce|Pr|Nd|Pm|Sm|Eu|Gd|Tb|Dy|Ho|Er|Tm|Yb|Lu)\s*\d\s*[+−-]/g) || []).length;
  const orbitals = (line.match(/\b[4-6]\s*[sfpd]\s*\d+/g) || []).length;
  return names >= 3 || ions >= 5 || (orbitals >= 6 && /radii|atomic|configuration|con\s*uration|lanthanoid/i.test(line))
    || (/ionic\s*radii\s*\/\s*pm/i.test(line) && /atomic\s*(?:number|name)|electronic/i.test(line));
}

/** Only typographic repairs: no reassignment of lost table columns. */
export function chemistryTypography(line: string): string {
  return mapOutsideMath(line, text => text
    .replace(/\bcon\s*urations?\b/gi, word => /s\s*$/i.test(word) ? "configurations" : "configuration")
    .replace(/\b([1-7])\s*([spdf])\s+(\d{1,2})\b/g, (_, shell, orbital, count) => {
      const capacity: Record<string, number> = {s: 2, p: 6, d: 10, f: 14};
      return Number(count) <= capacity[orbital] ? `$${shell}${orbital}^{${count}}$` : `${shell}${orbital} ${count}`;
    })
    .replace(/\bMnO\s*4\s*[-−]/g, () => "$\\mathrm{MnO}_{4}^{-}$")
    .replace(/\bH\s*2\s*O\b/g, () => "$\\mathrm{H_2O}$")
    .replace(/\bI\s*2\b/g, () => "$\\mathrm{I_2}$")
    .replace(/\bH\s*\+/g, () => "$\\mathrm{H}^{+}$")
    .replace(/\bI\s*[-−]/g, () => "$\\mathrm{I}^{-}$")
    .replace(/\b(La|Ce|Pr|Nd|Pm|Sm|Eu|Gd|Tb|Dy|Ho|Er|Tm|Yb|Lu|Fe|Mn|Cr|Co|Ni|Cu|Zn)\s+(\d)\s*([+−-])/g,
      (_, ion, charge, sign) => `$\\mathrm{${ion}}^{${charge}${sign === '−' ? '-' : sign}}$`));
}

/** Keep every original table token, with named rows separated in source order. */
function sourceRows(line: string): string[] {
  const rows = line.split(/(?=\b(?:Lanthanum|Cerium|Praseodymium|Neodymium|Promethium|Samarium|Europium|Gadolinium|Terbium|Dysprosium|Holmium|Erbium|Thulium|Ytterbium|Lutetium)\b)/g);
  return rows.flatMap(row => {
    // Short continued source entries are easier to review than an unbroken OCR paragraph.
    const words = row.trim().split(/\s+/); const parts: string[] = []; let current = "";
    for (const word of words) {
      if (current.length + word.length > 260 && current) { parts.push(current); current = ""; }
      current += (current ? " " : "") + word;
    }
    if (current) parts.push(current);
    return parts;
  }).filter(Boolean);
}

/** Add a preserved transcription before shared cleaning can discard ambiguous rows. */
export function layoutChemistrySlide(slide: Slide): Slide {
  if (slide.sections?.some(section => section.heading === SOURCE_TABLE_HEADING)) return slide;
  const evidence = [slide.title, ...(slide.sections || []).flatMap(section => section.lines), ...slide.bullets, ...slide.notes].join(" ");
  if (!/electronic config|electronic con\s*uration|lanthanoid|actinoid|d\s*-\s*and\s*f|permanganate|potassium iodide/i.test(evidence)) return slide;
  const source = slide.sections?.length ? slide.sections : [{heading: "Teacher Notes", kind: "bullets" as const, lines: [...slide.bullets, ...slide.notes]}];
  const output: NoteSection[] = [], retained: string[] = [];
  for (const section of source) {
    if (section.heading === "Source review — original extraction") { output.push(section); continue; }
    const readable: string[] = [];
    for (const line of section.lines) {
      if (!isCollapsedChemistryTable(line)) { readable.push(chemistryTypography(line)); continue; }
      retained.push(...sourceRows(line));
      // Recover an independently readable sentence without deriving a table correspondence.
      const sentence = line.match(/It may be noted that[\s\S]*?[.!](?:\s|$)/i)?.[0];
      if (sentence) readable.push(chemistryTypography(sentence.trim()));
      // A chemical observation may precede a flattened table in the same PDF line.
      const prefix = line.split(/The\s+d\s*-\s*and\s+f\s*-\s*Block\s+Elements/i)[0];
      if (prefix !== line && /In acid solutions/i.test(prefix)) readable.push(...prefix.split(/(?=\([ab]\))/).map(part => chemistryTypography(part.trim())).filter(Boolean));
    }
    if (readable.length) output.push({...section, lines: readable});
  }
  if (!retained.length) return {...slide, sections: output};
  output.push({heading: SOURCE_TABLE_HEADING, kind: "text", lines: [
    "The PDF merged table columns. All extracted entries are retained below in their original order. Check the textbook table before using a number as an ionic radius, atomic number or electron occupancy; no column correspondence has been guessed.",
    ...retained,
  ]});
  return {...slide, sections: output, notes_quality: {...slide.notes_quality, ready: false, lines: output.reduce((count, section) => count + section.lines.length, 0), derivations: slide.notes_quality?.derivations || 0, activity: slide.notes_quality?.activity || false, issues: [...new Set([...(slide.notes_quality?.issues || []), "Table alignment requires source review; every original entry is retained in the source-table pages."])]}};
}
