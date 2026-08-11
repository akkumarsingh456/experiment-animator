/**
 * Saved reference-book library.
 *
 * NCERT stays the primary source of truth. These are the standard Indian
 * reference books the teacher wants mined for extra depth (formula sheets,
 * derivations, graphs, board-exam questions, diagrams). The registry is used in
 * two places:
 *   1. `referenceBooksFor()` → injected into the Gemini notes prompt so the model
 *      searches the topic across these titles as well as NCERT.
 *   2. `REF_BOOK_PATTERN` → recognises uploaded PDFs of these books during
 *      retrieval so their chunks get the dedicated reference-book channel.
 */

export interface ReferenceBook {
  title: string;
  /** What this book is best used for while writing notes. */
  use: string;
}

type SubjectKey =
  | "mathematics"
  | "science"
  | "physics"
  | "chemistry"
  | "biology"
  | "social";

const JUNIOR: Record<SubjectKey, ReferenceBook[]> = {
  mathematics: [
    { title: "RS Aggarwal — Secondary School Mathematics", use: "step-by-step foundational problem solving and worked sums" },
    { title: "RD Sharma — Mathematics for Class 9/10", use: "advanced conceptual clarity and large practice-question banks" },
  ],
  science: [
    { title: "Lakhmir Singh & Manjit Kaur — Science", use: "simplified explanations, conceptual clarity, board-level exercises" },
    { title: "S. Chand — Science series", use: "deeper conceptual reinforcement and numericals" },
  ],
  physics: [
    { title: "Lakhmir Singh & Manjit Kaur — Physics", use: "simplified derivations and board-level numericals" },
    { title: "S. Chand — Physics", use: "conceptual reinforcement" },
  ],
  chemistry: [
    { title: "Lakhmir Singh & Manjit Kaur — Chemistry", use: "reaction tables, equation practice, board questions" },
    { title: "S. Chand — Chemistry", use: "conceptual reinforcement" },
  ],
  biology: [
    { title: "Lakhmir Singh & Manjit Kaur — Biology", use: "labelled diagrams and simplified explanations" },
    { title: "S. Chand — Biology", use: "conceptual reinforcement" },
  ],
  social: [
    { title: "All in One (Arihant) — Social Science", use: "structured theory, maps and important board questions" },
  ],
};

const SENIOR: Record<SubjectKey, ReferenceBook[]> = {
  mathematics: [
    { title: "RD Sharma — Objective & Subjective Mathematics", use: "calculus, algebra and coordinate geometry mastery for boards + competitive exams" },
    { title: "ML Aggarwal — Understanding Mathematics", use: "curriculum-aligned graded difficulty and solved examples" },
  ],
  science: [
    { title: "HC Verma — Concepts of Physics Vol 1 & 2", use: "physical intuition and rigorous analytical problems" },
    { title: "Pradeep's Fundamental Chemistry", use: "physical/organic/inorganic coverage with numericals" },
    { title: "Trueman's Elementary Biology Vol 1 & 2", use: "in-depth explanations and diagrams" },
  ],
  physics: [
    { title: "HC Verma — Concepts of Physics Vol 1 & 2", use: "deep physical intuition, rigorous analytical problem solving" },
    { title: "SL Arora — New Simplified Physics", use: "exhaustive board-style derivations and conceptual examples" },
  ],
  chemistry: [
    { title: "Pradeep's Fundamental Chemistry", use: "detailed numerical and theoretical breakdowns across all three branches" },
    { title: "O.P. Tandon — Physical/Organic/Inorganic Chemistry", use: "deeper mastery and competitive-exam foundation" },
  ],
  biology: [
    { title: "Trueman's Elementary Biology Vol 1 & 2", use: "in-depth explanations, labelled diagrams, board + medical entrance depth" },
    { title: "GRB Bathla — Biology", use: "objective practice and advanced theoretical revision" },
  ],
  social: [
    { title: "All in One (Arihant)", use: "structured theory, maps and important board questions" },
  ],
};

function subjectKey(subject: string): SubjectKey {
  const s = String(subject || "").toLowerCase();
  if (/chem/.test(s)) return "chemistry";
  if (/bio|zoo|bot/.test(s)) return "biology";
  if (/phys/.test(s)) return "physics";
  if (/math/.test(s)) return "mathematics";
  if (/histor|civic|polit|geog|econom|social/.test(s)) return "social";
  if (/science/.test(s)) return "science";
  return "science";
}

/** Reference books to search for a given class + subject. */
export function referenceBooksFor(klass: string, subject: string): ReferenceBook[] {
  const num = Number(String(klass || "").replace(/[^0-9]/g, "")) || 10;
  const table = num >= 11 ? SENIOR : JUNIOR;
  return table[subjectKey(subject)] || [];
}

/** Prompt block listing the reference books Gemini must also search. */
export function referenceBooksPrompt(klass: string, subject: string): string[] {
  const books = referenceBooksFor(klass, subject);
  if (!books.length) return [];
  return [
    "REFERENCE BOOK LIBRARY (search these titles' standard content for this topic, in addition to NCERT):",
    ...books.map((b) => `- ${b.title} — ${b.use}`),
    "NCERT REMAINS THE PRIMARY SOURCE: definitions, prescribed statements and NCERT's own derivations use NCERT wording.",
    "Use these reference books for extra depth only: additional correct formulas, alternative/shortcut forms, complete derivation steps, graph behaviour, comparison tables, labelled-diagram details, exam traps and memory tricks.",
    "Only include reference-book material that is genuinely part of this class's chapter scope. Never invent facts and never cite a book by name inside the notes.",
  ];
}

/** Filename/chapter pattern used to detect uploaded reference-book PDFs. */
export const REF_BOOK_PATTERN =
  /\b(pw|physics\s*wallah|shobhit|nirwan|med\s*easy|medeasy|chemhack|biohack|mind\s*map|mindmap|short\s*notes?|revision|one\s*shot|formula|hc\s*verma|verma|rs\s*aggarwal|rd\s*sharma|ml\s*aggarwal|aggarwal|sharma|lakhmir|manjit|s\.?\s*chand|schand|arihant|all\s*in\s*one|sl\s*arora|arora|pradeep|tandon|trueman|truemans|grb|bathla)\b/i;
