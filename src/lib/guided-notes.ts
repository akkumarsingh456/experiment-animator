import { dedupeLabelled, type NoteSection } from "@/lib/ncert-teacher-notes";
import { toNoteBlocks } from "@/lib/notes-paging";
import { splitMath } from "@/lib/latex-notation";

export type GuidedGroup = { heading: string; kind: "prose" | "list" | "formula" | "derivation" | "terms"; lines: string[] };
const categories: Array<[RegExp, string, GuidedGroup["kind"]]> = [
  [/^learning objectives?\b/i, "Learning objectives", "list"],
  [/^prerequisites?\b/i, "Before you begin", "list"],
  [/^common misconceptions?\b/i, "Common misconceptions", "list"],
  [/^summary\b/i, "Quick recap", "prose"],
  [/^support practice\b/i, "Support practice", "list"],
  [/^core practice\b/i, "Core practice", "list"],
  [/^challenge practice\b/i, "Challenge practice", "list"],
  [/^exit ticket\b/i, "Exit ticket", "list"],
  [/^(key terms?|definition)\b/i, "Key terms and definitions", "terms"],
  [/^(introduction|explanation|analogy)\b/i, "Understanding the concept", "prose"],
  [/^(formula|equation|relation|result)\b/i, "Formulas and relations", "formula"],
  [/^(variable|si unit|unit|dimension)\b/i, "Symbols and SI units", "list"],
  [/^derivation\b/i, "Step-by-step derivation", "derivation"],
  [/^(activity|experiment|discussion|classroom discussion)\b/i, "Investigate and discuss", "list"],
  [/^(worked example|example|ncert example|activity)\b/i, "Worked examples and activities", "list"],
  [/^(check your understanding|practice|guided question)\b/i, "Check your understanding", "list"],
  [/^(answers?|solution)\b/i, "Answers and explanations", "list"],
  [/^(graph|trend)\b/i, "Graphs and trends", "prose"],
  [/^(use|real.life|application)\b/i, "Applications", "list"],
  [/^(exam tip|memory trick)\b/i, "Remember", "list"],
];

/** Reorganise every verified note, without shortening or dropping extra lines. */
export function guidedGroups(sections: NoteSection[] | undefined, fallback: string[] = []): GuidedGroup[] {
  const sectionLines = sections?.filter((s) => s.kind !== "diagram").flatMap((s) => s.lines.map((line) =>
    /^\*\*/.test(line) || s.heading === "Teacher Notes" ? line : `**${s.heading.replace(/^\d+\.\s*/, "")}:** ${line}`));
  const lines = dedupeLabelled(sectionLines?.length ? sectionLines : fallback);
  const groups: GuidedGroup[] = [];
  const get = (heading: string, kind: GuidedGroup["kind"]) => {
    let group = groups.find((g) => g.heading === heading);
    if (!group) { group = { heading, kind, lines: [] }; groups.push(group); }
    return group;
  };
  for (const block of toNoteBlocks([{ heading: "Teacher Notes", kind: "bullets", lines }])) {
    // Keep each derivation together, including its leading formula.
    if (block.lines.some((line) => /^\*\*derivation\b/i.test(line))) {
      if (/^\*\*formula:/i.test(block.lines[0])) get("Formulas and relations", "formula").lines.push(block.lines[0].replace(/^\*\*formula:\*\*\s*/i, ""));
      groups.push({ heading: "Step-by-step derivation", kind: "derivation", lines: block.lines });
      continue;
    }
    for (const line of block.lines) {
      const match = line.match(/^\*\*([^*]+):\*\*\s*(.*)$/s);
      const label = match?.[1] || "Explanation";
      const category = categories.find(([pattern]) => pattern.test(label));
      let [heading, kind] = category ? [category[1], category[2]] : ["Important points", "list" as const];
      const body = match?.[2] || line;
      // An equation reference or a prose paragraph is not a formula table row.
      const math = splitMath(body).filter((part) => part.type !== "text").map((part) => part.value).join(" ");
      const formulaRow = body.split(" | ").length === 3;
      const actualRelation = /[=∝<>]|\\(?:propto|approx|equiv|rightarrow|rightleftharpoons|leq|geq)\b/.test(math || body);
      if (kind === "formula" && !formulaRow && !actualRelation) { heading = "Important points"; kind = "list"; }
      // Named terms, formula names and example steps still need their labels.
      const term = label.match(/^key term\s*[—-]\s*(.+)$/i);
      const keepLabel = /^(activity|experiment|discussion|worked example|example|answer\s*[—-]|solution\s*[—-])/i.test(label);
      get(heading, kind).lines.push(term ? `**${term[1]}:** ${body}` : keepLabel ? line : body);
    }
  }
  const order = ["Learning objectives", "Before you begin", "Understanding the concept", "Key terms and definitions", "Formulas and relations", "Symbols and SI units", "Step-by-step derivation", "Graphs and trends", "Important points", "Applications", "Worked examples and activities", "Investigate and discuss", "Common misconceptions", "Check your understanding", "Support practice", "Core practice", "Challenge practice", "Answers and explanations", "Remember", "Quick recap", "Exit ticket"];
  const rank = (group: GuidedGroup) => { const index = order.indexOf(group.heading); return index < 0 ? 9 : index; };
  return groups.sort((a, b) => rank(a) - rank(b));
}

/** Keep shared prose once in a flowing document, while preserving calculations and tasks. */
export function uniqueTopicGroups(topics: GuidedGroup[][]): GuidedGroup[][] {
  const seen = new Set<string>();
  return topics.map((groups) => groups.map((group) => {
    if (group.kind === "formula" || group.kind === "derivation" || /practice|answers|check your understanding|objectives|exit ticket|before you begin|recap|discuss|activities/i.test(group.heading)) return group;
    const lines = group.lines.filter((line) => {
      const key = line.replace(/\*\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    return { ...group, lines };
  }).filter((group) => group.lines.length));
}

export function guidedFormulaRow(line: string): { concept: string; expression: string; unit: string } {
  const cells = line.split(" | ");
  if (cells.length === 3) return { concept: cells[0], expression: cells[1], unit: cells[2] };
  const named = line.match(/^([^$:=]{3,60}):\s*(.+)$/);
  return { concept: named?.[1] || "Relation", expression: named?.[2] || line, unit: "—" };
}
