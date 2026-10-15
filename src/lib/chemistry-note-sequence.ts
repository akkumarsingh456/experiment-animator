import type { NoteSection } from "@/lib/ncert-teacher-notes";

/** Presentation ordering only. Keep source words, reaction steps and proofs intact. */
export function sequenceChemistryNotes(sections: NoteSection[] | undefined, subject: string, chapter = ""): NoteSection[] {
  const original = sections || [];
  if (!/^chemistry$/i.test(subject) && !(/^science$/i.test(subject) && /\(chemistry\)/i.test(chapter))) return original;
  const groups: Array<{section: NoteSection; rank: number; index: number}> = [];
  const categories: Array<[RegExp,string,number]> = [
    [/^(learning objective|prerequisite|before you begin)/i,"Before you begin",0],
    [/^(definition|key term|introduction)/i,"Key terms and definitions",10],
    [/^(composition|constituent|component|structure|classification|electronic configuration)/i,"Composition and structure",20],
    [/^(nomenclature|iupac|naming)/i,"Nomenclature",30],
    [/^(bonding|theory|werner|valence bond|crystal field)/i,"Bonding and theory",40],
    [/^(isomerism|isomer)/i,"Isomerism",50],
    [/^(preparation|synthesis)/i,"Preparation",60],
    [/^(physical propert|chemical propert|propert|trend)/i,"Properties and trends",70],
    [/^(mechanism|process|reaction|chemical reaction)/i,"Reactions and mechanisms",80],
    [/^(condition|assumption|validity|limitation|exception)/i,"Conditions and limitations",85],
    [/^(use|application)/i,"Applications",90],
    [/^(example|worked example|activity|experiment|discussion)/i,"Examples and activities",100],
    [/^(practice|check your understanding|support practice|core practice|challenge practice|answer|exit ticket)/i,"Practice and review",110],
  ];
  let index = 0;
  for (const section of original) {
    if ((section.heading === "Source table — original extracted entries" || section.heading === "Source review — original extraction")) { groups.push({section,rank:120,index:index++}); continue; }
    // A derivation or procedure is atomic: never sort its individual steps.
    if (section.kind === "diagram" || section.lines.some(line => /derivation|\bstep\s*\d/i.test(line))) {
      groups.push({section:{...section,lines:[...section.lines]},rank:75,index:index++}); continue;
    }
    for (const line of section.lines) {
      const label = line.match(/^\s*\*\*([^*]+):\*\*/)?.[1] || section.heading.replace(/^\d+\.\s*/, "");
      const category = categories.find(([pattern]) => pattern.test(label));
      // Conditions qualify the preceding statement: move them with it, never to another reaction.
      if (category?.[2] === 85 && groups.length && groups.at(-1)!.rank < 100) {
        groups.at(-1)!.section.lines.push(line);
        continue;
      }
      groups.push({section:{...section,heading:category?.[1] || section.heading,lines:[line]},rank:category?.[2] ?? 55,index:index++});
    }
  }
  groups.sort((a,b)=>a.rank-b.rank || a.index-b.index);
  const output: NoteSection[] = [];
  for (const {section} of groups) {
    const previous=output.at(-1);
    if(previous && previous.heading===section.heading && previous.kind===section.kind) previous.lines.push(...section.lines);
    else output.push({...section,lines:[...section.lines]});
  }
  return output;
}
