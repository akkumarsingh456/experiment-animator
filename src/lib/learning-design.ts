import { cleanSourceNoteLine } from "@/lib/source-note-quality";
import type { NoteSection } from "@/lib/ncert-teacher-notes";
import { latexLineValid } from "@/lib/notes-verification";

export type LearningFamily = "language" | "mathematics" | "science" | "humanities" | "commerce" | "computing" | "general";
export function learningProfile(subject = "", klass = "") {
  const family: LearningFamily = /english|hindi|sanskrit|urdu|language|हिन्दी|हिंदी|संस्कृत/i.test(subject) ? "language"
    : /math|गणित/i.test(subject) ? "mathematics"
    : /science|physics|chemistry|biology|botany|zoology|विज्ञान/i.test(subject) && !/computer|political|social/i.test(subject) ? "science"
    : /computer|informatics|technology/i.test(subject) ? "computing"
    : /accountancy|business|commerce|economics/i.test(subject) ? "commerce"
    : /history|geography|political|social|civics|sociology|psychology/i.test(subject) ? "humanities" : "general";
  const focus = {
    language: "context and sequence, vocabulary in context, character or speaker, theme, textual evidence, literary or grammatical features, and a model response with reasons",
    mathematics: "definitions, conditions of the theorem, each justified proof or derivation step, a worked example, a diagram where useful, and checking the result",
    science: "concept and mechanism, labelled structures or apparatus, symbol meanings and units when relevant, assumptions, source-supported derivations, observations and limitations",
    humanities: "context, chronology or location where relevant, causes and consequences, comparisons, evidence and different perspectives; distinguish interpretation from textbook facts",
    commerce: "definitions, assumptions, processes, source cases, worked calculations or entries when present, interpretation and limitations",
    computing: "concepts, syntax and algorithm steps, a source-supported trace or worked example, expected output and common errors",
    general: "key terms, an explanation with evidence, a worked source example, application, practice and a reasoned conclusion",
  }[family];
  const senior = /11|12/.test(klass);
  return { family, focus, level: senior ? "Build from a short prerequisite recap to deeper reasoning, assumptions, comparisons and independent application within this chapter." : "Use short sentences, explain unfamiliar words, build one idea at a time, model an example before independent practice, and use concrete representations." };
}

/** One discussion task anchored in an actual note, never a fabricated NCERT experiment. */
export function sourceDiscussion(title: string, sections: NoteSection[], subject: string, klass: string): NoteSection | undefined {
  if (sections.some((s) => /activity|experiment|discussion/i.test(s.heading) || s.lines.some((l) => /^\*\*(?:NCERT )?(activity|experiment|discussion)/i.test(l)))) return;
  const evidence = sections.filter((s) => s.kind !== "diagram" && !/^Source (?:review|table)/.test(s.heading)).flatMap((s) => s.lines)
    .find((l) => /[\p{L}]{3}/u.test(l) && !/^\*\*(learning|prerequisite|practice|exit|answer|derivation)/i.test(l));
  if (!evidence) return;
  const body = cleanSourceNoteLine(evidence).replace(/^\*\*[^*]+:\*\*\s*/, "");
  if (!body) return;
  const { family } = learningProfile(subject, klass);
  const task = {
    language: "In pairs, locate the passage that supports this statement. One student explains a word, action or image; the other offers an interpretation and points to the words supporting it.",
    mathematics: "In pairs, identify the given information and the claim or relationship. Draw a representation if helpful, then explain each mathematical step and its reason to your partner.",
    science: "In pairs, use the textbook diagram, described observation or explanation to predict what it shows. Compare the prediction with the source, then explain the mechanism. Use a paper model if the source gives no experiment procedure.",
    humanities: "In pairs, identify the claim and its evidence. Make a cause–consequence chain or a comparison supported by the passage. Discuss an alternative explanation and what evidence would help assess it.",
    commerce: "In pairs, use the textbook case or relationship to identify the decision, assumptions and consequences. Explain a calculation or process if the source supplies one, then compare your reasoning.",
    computing: "In pairs, trace the textbook example or algorithm one step at a time. Record each change and justify the next step. Compare your trace with the supplied explanation or output.",
    general: "In pairs, explain this idea in your own words. Produce a short representation or comparison supported by the notes, and ask your partner to justify one part of it.",
  }[family];
  return { heading: "Classroom discussion", kind: "bullets", lines: [
    `**Activity:** Evidence workshop — ${title}. Teacher-designed discussion based on the supplied textbook notes; not a numbered NCERT experiment.`,
    `**Activity source:** ${body}`,
    "**Activity materials:** Selected textbook passage or diagram, notebook and pencil; work in pairs with an explainer and an evidence checker.",
    `**Activity steps:** ${task}`,
    "**Discussion:** Which part of the source supports your conclusion? Where did your explanations differ? What condition or assumption matters?",
    "**Activity outcome:** Submit a claim, its supporting textbook evidence and your reasoning. Teacher checks whether the evidence supports the claim and invites one pair to explain and another to question it.",
  ] };
}

export type NotesQuality = { ready: boolean; issues: string[]; lines: number; derivations: number; activity: boolean };
/** Add teaching prompts only; never invent missing definitions or derivations. */
export function learningScaffold(title: string, sections: NoteSection[]): NoteSection[] {
  const lines = sections.filter((s) => s.kind !== "diagram" && !/^Source (?:review|table)/.test(s.heading)).flatMap((s) => s.lines);
  if (lines.length < 3) return sections;
  const has = (label: string) => lines.some((l) => new RegExp(`^\\*\\*${label}`, "i").test(l));
  const prompts: string[] = [];
  if (!has("learning objective")) prompts.push(`**Learning objective:** Explain ${title} in your own words and support your explanation with evidence from these notes.`);
  if (!has("prerequisite")) prompts.push("**Prerequisite:** Before reading, recall a related idea from your earlier lessons; identify any unfamiliar words to clarify with the class.");
  if (!has("support practice")) prompts.push("**Support practice:** Select a key term from this topic. Complete: ‘It means …; the source supports this because …’.");
  if (!has("core practice")) prompts.push("**Core practice:** Explain a process, relationship, argument or interpretation in this topic. Give the steps or reasons and point to the source evidence.");
  if (!has("challenge practice")) prompts.push("**Challenge practice:** Compare two ideas or cases in the topic. Which differences matter, and how does the supplied source support your conclusion?");
  if (!has("answers|answer|solution")) prompts.push("**Answers and explanations:** For the support task, the meaning must agree with the notes; for the core task, check the sequence and reasons against the source; for the challenge task, check that each comparison is supported. If calculations are used, show the intermediate steps and applicable units.");
  if (!has("exit ticket")) prompts.push(`**Exit ticket:** State one thing you can now explain about ${title}, give supporting evidence, and write one question that remains.`);
  return prompts.length ? [...sections, { heading: "Learning and practice", kind: "bullets", lines: prompts }] : sections;
}
/** Structural checks are not a claim that lexical overlap proves factual correctness. */
export function reviewNotes(sections: NoteSection[] | undefined): NotesQuality {
  const lines = (sections || []).filter((s) => s.kind !== "diagram").flatMap((s) => s.lines);
  const issues: string[] = [];
  const factual = lines.filter((l) => !/^\*\*(activity|discussion|learning objective|prerequisite|support practice|core practice|challenge practice|answers and explanations|exit ticket)/i.test(l));
  if (factual.length < 3) issues.push("The source provides too little readable material for complete notes.");
  if (lines.some((l) => latexLineValid(l).invalid)) issues.push("A mathematical expression needs notation review.");
  const derivationHeads = lines.map((l, i) => /^\*\*derivation of/i.test(l) ? i : -1).filter((i) => i >= 0);
  if (derivationHeads.some((i) => !/^\*\*derivation step/i.test(lines[i + 1] || ""))) issues.push("A derivation heading has no supporting steps.");
  if (!derivationHeads.length && lines.some((l) => /^\*\*derivation step/i.test(l))) issues.push("The extracted derivation needs a stated starting relation and a complete sequence.");
  if (lines.some((l) => /\b(?:Current Electricity|Reprint|Rationalised)\s+\d{2,3}\b|\b(?:TheSI|dveEm)\b/.test(l))) issues.push("A textbook extraction fragment needs source review.");
  const activity = lines.some((l) => /^\*\*(?:NCERT )?(?:activity|experiment|discussion)/i.test(l));
  if (!activity) issues.push("No source-based classroom task is available.");
  return { ready: !issues.length, issues, lines: lines.length, derivations: derivationHeads.length, activity };
}
