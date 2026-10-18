import { splitMath } from "./latex-notation";

const elements = new Set(
  "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og R X Ph Me Et Bu".split(
    " ",
  ),
);
const metal =
  "Li|Na|K|Rb|Cs|Mg|Ca|Sr|Ba|Al|Sc|Ti|V|Cr|Mn|Fe|Co|Ni|Cu|Zn|Ag|Cd|Hg|Pb|Sn|La|Ce|Pr|Nd|Pm|Sm|Eu|Gd|Tb|Dy|Ho|Er|Tm|Yb|Lu";
const metalCharge = new RegExp(`^(${metal})([1-8])([+−-])$`);
const atom = String.raw`[A-Z][a-z]?\d*`;
const round = String.raw`\((?:${atom})+\)\d*`;
const square = String.raw`\[(?:${atom}|${round})+\]\d*`;
const species = new RegExp(
  String.raw`(?<![A-Za-z0-9_\\])\d*(?:${atom}|${round}|${square})+(?:\^\d*[+−-](?!>)|[+−-](?!>))?(?![A-Za-z0-9_])`,
  "g",
);

/** Render a recognised written formula only. Never infer a lost charge, isotope,
 * atom count, reagent or reaction. Uncertain OCR and existing LaTeX stay intact.
 */
export function chemicalSpeciesLatex(raw: string): string | null {
  if (!/[\d+−-]/.test(raw) || !/^[A-Za-z0-9()[\]^+−-]+$/.test(raw)) return null;
  if (/^\d+[A-Z][a-z]?$/.test(raw)) return null;
  if (/^[A-Z][a-z]?\d+$/.test(raw) && !/^(?:H2|N2|O2|O3|F2|Cl2|Br2|I2|P4|S8|C60|C70)$/.test(raw))
    return null;
  if (/^SN[12]$/.test(raw)) return String.raw`\mathrm{S}_{\mathrm{N}}${raw.at(-1)}`;
  const symbols = raw.match(/[A-Z][a-z]?/g) || [];
  if (!symbols.length || symbols.some((symbol) => !elements.has(symbol))) return null;
  let depth = 0,
    squareDepth = 0;
  for (const c of raw) {
    if (c === "(") depth++;
    if (c === ")" && --depth < 0) return null;
    if (c === "[") squareDepth++;
    if (c === "]" && --squareDepth < 0) return null;
  }
  if (depth || squareDepth) return null;
  // O2-, for example, does not establish whether 2 is an atom count or charge.
  if (/^[A-Z][a-z]?\d+[+−-]$/.test(raw) && !metalCharge.test(raw)) return null;
  let written = raw.replace(/−/g, "-");
  const ion = written.match(metalCharge);
  if (ion) written = `${ion[1]}^${ion[2]}${ion[3]}`;
  written = written.replace(/\](\d+)([+-])$/, "]^$1$2");
  return `\\ce{${written}}`;
}
function plainChemistry(text: string): string {
  // Orbital occupancies and hybridisation labels have independent meanings.
  const orbital = text
    .replace(/\b([1-7])\s*([spdf])\s*(\d{1,2})\b/g, (original, shell, letter, count) => {
      const cap: Record<string, number> = { s: 2, p: 6, d: 10, f: 14 };
      return Number(count) <= cap[letter] ? `$${shell}${letter}^{${count}}$` : original;
    })
    .replace(/\bsp([123])(?:d([12]))?\b/g, (_, p, d) => `$sp^{${p}}${d ? `d^{${d}}` : ""}$`);
  return splitMath(orbital)
    .map((part) =>
      part.type === "text"
        ? part.value.replace(species, (token) => {
            const latex = chemicalSpeciesLatex(token);
            return latex ? `$${latex}$` : token;
          })
        : `$${part.value}$`,
    )
    .join("");
}
/** Chemistry-only presentation. Math authored with LaTeX commands is opaque. */
export function chemicalTextNotation(raw: string): string {
  return splitMath(raw)
    .map((part) => {
      if (part.type === "text") return plainChemistry(part.value);
      const mark = part.type === "block" ? "$$" : "$";
      const latex = /\\|[_{}]/.test(part.value) ? null : chemicalSpeciesLatex(part.value.trim());
      return mark + (latex || part.value) + mark;
    })
    .join("");
}
