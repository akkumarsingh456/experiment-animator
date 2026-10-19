import type { NoteSection } from "./ncert-teacher-notes";
import type { GuidedGroup } from "./guided-notes";

type Item = { heading: string; kind: string; lines: string[] };
const label = (line: string) => line.match(/^\s*\*\*([^*]+):\*\*/)?.[1] || "";
export function topicOrderRank(heading: string): number {
  if (/^Source (?:review|table)|^Teacher revision (?:source|notes)/i.test(heading)) return 90;
  if (/^(?:activity|experiment|investigate|classroom discussion|discussion)\b/i.test(heading)) return 0;
  if (/^(?:important|key points?|properties|limitations?|exceptions?|common misconceptions?|graphs?|trends?)\b/i.test(heading)) return 20;
  if (/formula|equation|relation|derivation|^MLT |^symbols|^si units?|^units?|^dimension|^variables|^conditions?|^assumptions?|^meaning and conditions/i.test(heading)) return 30;
  if (/^(?:use|uses|applications?)\b/i.test(heading)) return 40;
  if (/practice|exercise|answers?|exit ticket|recap|remember|examples?|worked example/i.test(heading)) return 50;
  return 10;
}
const names: Record<number, string> = { 0: "Activity / experiment", 10: "Topic notes", 20: "Important points", 30: "Formulas and derivations", 40: "Uses and applications", 50: "Practice and revision" };
const relation = (lines: string[]) => {
  const expressions = [...(lines[0] || "").matchAll(/\$\$?([^$]+)\$\$?/g)].map(match => match[1]);
  const written = expressions.find(body => /[=∝]|\\(?:approx|equiv|propto|rightarrow|rightleftharpoons)\b/.test(body));
  return written?.replace(/\s+/g, "");
};
const qualifier = (text: string) => /^(?:conditions?|assumptions?|validity|limitations?|exceptions?|variables|si units?|units?)\b/i.test(text);

/** Pure per-topic ordering. No generation, rewriting, filtering or deduplication.
 * Existing diagrams, tables, code, experiments and derivation steps remain intact. */
function arrange<T extends Item>(items: T[]): T[] {
  type Atom = { item: T; rank: number; index: number; qualifier: boolean };
  const atoms: Atom[] = [];
  const proofKeys = new Set(items.filter(item => item.kind === "derivation" || /^(?:step-by-step )?derivation/i.test(item.heading) || item.lines.some(line => /^derivation/i.test(label(line)))).map(item => relation(item.lines)).filter(Boolean));
  for (const original of items) {
    const fixed = /^Source (?:review|table)|^Teacher revision|^MLT Dimensional Formula$|^Problem-solving formula reference$/i.test(original.heading)
      || /^(?:derivation|step-by-step derivation|activity|experiment|investigate|classroom discussion|discussion|reaction|mechanism|process|procedure|preparation)\b/i.test(original.heading)
      || original.kind === "diagram" || /\b(?:code|program|algorithm|table)\b/i.test(original.heading);
    if (!fixed && original.kind === "formula" && original.lines.length > 1 && original.lines.some(line => proofKeys.has(relation([line])))) {
      for (const line of original.lines) atoms.push({ item: { ...original, lines: [line] }, rank: 30, index: atoms.length, qualifier: false });
      continue;
    }
    if (fixed || !original.lines.some(line => label(line))) {
      atoms.push({ item: { ...original, lines: [...original.lines] }, rank: topicOrderRank(original.heading), index: atoms.length, qualifier: qualifier(original.heading) });
      continue;
    }
    for (let i = 0; i < original.lines.length; i++) {
      const line = original.lines[i], tag = label(line), lines = [line];
      const proof = /^derivation(?: of| step|$)/i.test(tag);
      if (proof) while (i + 1 < original.lines.length && /^derivation step|^variables|^conditions?|^assumptions?|^si units?|^units?/i.test(label(original.lines[i + 1]))) lines.push(original.lines[++i]);
      const priority = proof ? 30 : topicOrderRank(tag || original.heading);
      const heading = /^(?:Teacher Notes|Important points|Worked examples and activities|Examples and activities)$/i.test(original.heading) && tag
        ? names[priority] || original.heading : original.heading;
      const previous = atoms.at(-1);
      // Qualifiers and numbered continuation steps stay with their original point.
      if (previous && tag && ((qualifier(tag) && previous.rank < 90) || (/^(?:activity|experiment|reaction|mechanism|process) step/i.test(tag) && previous.rank === topicOrderRank(tag)))) {
        previous.item.lines.push(...lines); continue;
      }
      atoms.push({ item: { ...original, heading, lines }, rank: priority, index: atoms.length, qualifier: qualifier(tag || original.heading) });
    }
  }
  // Preserve association of separately headed conditions with the preceding block.
  const bundles: Array<{ atoms: Atom[]; rank: number; index: number }> = [];
  for (const atom of atoms) {
    if (atom.qualifier && bundles.length && bundles.at(-1)!.rank < 90) bundles.at(-1)!.atoms.push(atom);
    else bundles.push({ atoms: [atom], rank: atom.rank, index: atom.index });
  }
  // A formula and its matching proof move as one unit, even if originally apart.
  const isProof = (atom: Atom) => atom.item.kind === "derivation" || /^(?:step-by-step )?derivation/i.test(atom.item.heading) || atom.item.lines.some(line => /^derivation/i.test(label(line)));
  const moved = new Set<number>();
  for (let index = 0; index < bundles.length; index++) {
    const proof = bundles[index];
    if (!proof.atoms.some(isProof)) continue;
    const identity = relation(proof.atoms.flatMap(atom => atom.item.lines));
    const target = bundles.findIndex((candidate, n) => n < index && !moved.has(n) && candidate.rank === 30
      && !isProof(candidate.atoms[0])
      && !!identity && relation(candidate.atoms.flatMap(atom => atom.item.lines)) === identity);
    if (target >= 0) { bundles[target].atoms.push(...proof.atoms); moved.add(index); }
  }
  return bundles.filter((_, index) => !moved.has(index)).sort((a, b) => a.rank - b.rank || a.index - b.index).flatMap(bundle => bundle.atoms.map(atom => atom.item));
}

export const orderTopicSections = (sections: NoteSection[] | undefined): NoteSection[] => arrange(sections || []);
export const orderTopicGroups = (groups: GuidedGroup[]): GuidedGroup[] => arrange(groups);
