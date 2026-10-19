import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import katex from "katex";
import { NCERT_SYLLABUS, subtopicsFor } from "@/lib/ncert-syllabus";
import { SOURCE_FORMULA_RULES } from "@/lib/source-formula-supplements";
import { PHYSICS_FORMULA_REFERENCE } from "@/lib/physics-formula-reference";
import { normalizeLatex, splitMath } from "@/lib/latex-notation";
import { MathText } from "@/components/MathText";
import PagedNoteSections from "@/components/PagedNoteSections";

const key = (s: string) => s.replace(/^Chapter\s+\d+\s*:\s*/i, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const chapters = Object.entries(NCERT_SYLLABUS).flatMap(([klass, subjects]) =>
  Object.entries(subjects).flatMap(([subject, entries]) => entries.map(entry => ({ klass, subject, ...entry }))));
const references = Object.entries(PHYSICS_FORMULA_REFERENCE).flatMap(([klass, entries]) =>
  entries.flatMap(entry => entry.rows.map(([name, formula, conditions]) => ({ klass, chapter: entry.chapter, name, formula: `$${formula}$`, conditions }))));
const formulas = [...references.map(row => ({ ...row, subject: "Physics" })),
  ...SOURCE_FORMULA_RULES.map(row => ({ ...row, subject: row.subjects.includes("chemistry") ? "Chemistry" : "Physics", conditions: "" }))];
// Compare semantic presentation, excluding only the source annotation and whitespace.
const mathml = (formula: string) => katex.renderToString(formula, { throwOnError: true, strict: false, output: "mathml" })
  .replace(/<annotation[\s\S]*?<\/annotation>/g, "").replace(/\s+/g, " ");

describe("Chapter-by-chapter formula presentation verification", () => {
  it.each(formulas)("preserves the mathematical notation: $name", row => {
    for (const part of splitMath(row.formula)) {
      if (part.type === "text") continue;
      expect(mathml(normalizeLatex(part.value)), row.name).toBe(mathml(part.value));
    }
    const html = renderToStaticMarkup(<MathText text={row.formula} subject={row.subject} />);
    expect(html, row.name).not.toContain("katex-error");
    expect(html, row.name).toContain("katex");
    const displayed = (html.match(/<math[\s\S]*?<\/math>/g) || []).map(value => value.replace(/<annotation[\s\S]*?<\/annotation>/g, "").replace(/\s+/g, " "));
    const expected = splitMath(row.formula).filter(part => part.type !== "text").map(part => mathml(part.value).match(/<math[\s\S]*?<\/math>/)![0]);
    expect(displayed, row.name).toEqual(expected);
  });
  it.each(chapters)("$klass $subject $chapter preserves chapter text and renders its available references", ({ klass, subject, chapter }) => {
    const rows = subject === "Physics" ? references.filter(row => row.klass === klass && key(row.chapter) === key(chapter)) : [];
    const lines = ["Original explanation remains unchanged.", ...rows.map(row => `${row.name}: ${row.formula} ${row.conditions}`)];
    const sections = [{ heading: "Teacher Notes", kind: "bullets" as const, lines }];
    const before = JSON.stringify(sections);
    const html = renderToStaticMarkup(<PagedNoteSections sections={sections} subject={subject} />);
    expect(html).not.toContain("katex-error");
    expect(html).toContain("Original explanation remains unchanged.");
    expect(JSON.stringify(sections)).toBe(before);
    if (rows.length) expect(html).toContain("katex");
  });
  it("records coverage honestly for every configured chapter", () => {
    const results = chapters.map(({ klass, subject, chapter }) => {
      const rows = subject === "Physics" ? references.filter(row => row.klass === klass && key(row.chapter) === key(chapter)) : [];
      return { klass, subject, chapter, subtopics: subtopicsFor(klass, subject, chapter).length,
        chapterReferenceFormulas: rows.length,
        status: rows.length ? "Chapter reference formulas rendered and source preserved" : "Shared renderer and source preservation checked; no chapter formula corpus available locally" };
    });
    if (process.env.EDUPLAN_WRITE_FORMULA_AUDIT === "1") writeFileSync("docs/CHAPTER_FORMULA_AUDIT.json", JSON.stringify({
      scope: "Local configured curriculum, existing curated formula references and shared note renderer. Does not certify every saved/generated lesson or factual correctness of every uploaded textbook formula.",
      chapters: results.length, formulaEntries: formulas.length, chapterResults: results,
    }, null, 2) + "\n");
    expect(results.length).toBe(chapters.length);
    expect(new Set(results.map(row => `${row.klass}/${row.subject}/${row.chapter}`)).size).toBe(chapters.length);
  });
});
