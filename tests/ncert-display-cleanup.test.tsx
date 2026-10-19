import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanNcertDisplayText, ncertNotesDisplaySlide } from "@/lib/ncert-display-cleanup";
import { presentNoteLabels } from "@/lib/note-label-presentation";
import PagedNoteSections from "@/components/PagedNoteSections";
import { GuidedLessonNotes } from "@/components/GuidedLessonNotes";
import { NCERT_SYLLABUS } from "@/lib/ncert-syllabus";

const subjects: Record<string, string[]> = {
  "9": ["Social Science", "Mathematics", "Science", "Computer Science"],
  "10": ["Social Science", "Mathematics", "Science", "Computer Science"],
  "11": ["Mathematics", "Physics", "Chemistry", "Computer Science"],
  "12": ["Mathematics", "Physics", "Chemistry", "Computer Science"],
};
const chapters = Object.entries(NCERT_SYLLABUS).flatMap(([klass, streams]) =>
  Object.entries(streams).filter(([subject]) => subjects[klass]?.includes(subject))
    .flatMap(([subject, entries]) => entries.map(entry => ({ klass, subject, ...entry }))));

describe("NCERT extraction display cleanup only", () => {
  it.each([
    ["Proteins 2019-20 421 Biomolecules have specific structures.", "Proteins have specific structures."],
    ["2018-19 Physics 478 The equation remains $E=mc^2$.", " The equation remains $E=mc^2$."],
    ["2019-20 446 Chemistry Note remains.", " Note remains."],
    ["417 Biomolecules 2019-20 Enzymes act as catalysts.", " Enzymes act as catalysts."],
    ["Biomolecules 417 2019-20 Enzymes act as catalysts.", " Enzymes act as catalysts."],
    ["The the energy of of the system and and its surroundings.", "The energy of the system and its surroundings."],
  ])("cleans confirmed furniture/repeated function words: %s", (input, output) => {
    expect(cleanNcertDisplayText(input)).toBe(output);
    expect(cleanNcertDisplayText(output)).toBe(output);
  });
  it.each([
    "Between 2019-20 and 2020-21 the rate was 6.22 percent.",
    "Find 6.22 kJ mol -1; n = 2, 2, 3. Figure 14.1; equation (9.3).",
    String.raw`$a a + b b = c c$ and $t_{1/2}=\frac{\ln2}{k}$`,
    'The words "the the" and “and and” are quoted. `for for` is code.',
    "He had had enough evidence; she said that that was sufficient.",
    "The a a sequence and 2 2 numerical values remain unchanged.",
    "2019-20 417 unidentified heading is ambiguous and stays.",
    String.raw`$\text{2019-20 417 Biomolecules}$`,
  ])("preserves meaningful numbers, math, code, quotes and uncertain text: %s", input => {
    expect(cleanNcertDisplayText(input)).toBe(input);
  });
  it("never cleans original source-review or source-table entries", () => {
    const raw = "2019-20 417 Biomolecules the the source remains.";
    for (const heading of ["Source review — original extraction", "Source table — original extracted entries"])
      expect(presentNoteLabels([raw, raw], heading).map(line => line.text)).toEqual([raw, raw]);
  });
  it.each(chapters)("$klass $subject $chapter keeps source arrays unchanged in both note views", ({ klass, subject, chapter }) => {
    const runningTitle = chapter.replace(/^Chapter\s+\d+\s*:\s*/i, "");
    expect(cleanNcertDisplayText(`2019-20 421 ${runningTitle} The body remains.`)).toBe(" The body remains.");
    const clean = "The energy of the system remains $E=mc^2$.";
    const noisy = "The the energy of of the system 2019-20 421 Biomolecules remains $E=mc^2$.";
    const sections = [{ heading: "Key points", kind: "bullets" as const, lines: [noisy] }];
    const before = JSON.stringify(sections);
    expect(presentNoteLabels(sections[0].lines, "Key points")[0].text).toBe(clean);
    const html = renderToStaticMarkup(<PagedNoteSections sections={sections} subject={subject} />);
    expect(html).not.toContain("2019-20");
    expect(html).not.toContain("the energy of of");
    expect(html).not.toContain("katex-error");
    const guided = renderToStaticMarkup(<GuidedLessonNotes title={chapter} klass={klass} subject={subject}
      slides={[{ title: chapter, bullets: [], notes: [], visual: "", sections }]} />);
    expect(guided).not.toContain("2019-20");
    expect(guided).not.toContain("katex-error");
    expect(JSON.stringify(sections)).toBe(before);
  });
});


describe("Presentation boundary keeps original notes and source review", () => {
  it("retains duplicate originals, examples, all values, signs and formula bodies", () => {
    const source = "2019-20 421 Biomolecules The the formula remains $E=mc^2$.";
    const original = { title: "Proteins", bullets: [source], notes: [source], visual: "", sections: [
      { heading: "Key points", kind: "bullets" as const, lines: [source, source] },
      { heading: "Source review — original extraction", kind: "bullets" as const, lines: [source, source] },
    ] };
    const before = JSON.stringify(original);
    const shown = ncertNotesDisplaySlide(original, "Chemistry");
    expect(JSON.stringify(original)).toBe(before);
    expect(shown.sections![0].lines).toHaveLength(2);
    expect(shown.sections![0].lines[0]).toContain("$E=mc^2$");
    expect(shown.sections![1]).toBe(original.sections[1]);
    expect(shown.sections![1].lines).toEqual([source, source]);
    expect(ncertNotesDisplaySlide(original, "English")).toBe(original);
  });
});


it("preserves unformatted programming syntax in code-labelled sections", () => {
  expect(cleanNcertDisplayText("for for from from", "Program output")).toBe("for for from from");
  expect(cleanNcertDisplayText("**Code:** for for from from")).toBe("**Code:** for for from from");
});
