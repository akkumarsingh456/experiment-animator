import { describe, expect, it } from "vitest";
import { prosePoints } from "@/lib/note-points";
import { toNoteBlocks, paginateNoteSections } from "@/lib/notes-paging";
import { guidedGroups } from "@/lib/guided-notes";

const sentences = [
  "The source explains the first important idea in detail so that students can understand its meaning clearly.",
  "The next sentence describes a second important idea and its application without changing any source words.",
  "Students can refer to Fig. 3.15 and Eq. (3.39) for the original example, using a value of 2.5 in their working.",
];
describe("Point formatting shared by every subject", () => {
  it("splits long prose into source sentences without rewriting, and is idempotent", () => {
    expect(prosePoints(sentences.join(" "))).toEqual(sentences);
    expect(prosePoints(sentences.join(" ")).flatMap(prosePoints)).toEqual(sentences);
  });
  it("never splits inside inline/display math or changes its bytes", () => {
    const equation = "$R=R_1+R_2\\quad\\text{Use Fig. A. Keep these words.}$";
    const display = "$$\\begin{aligned} V&=IR\\\\ P&=IV \\end{aligned}$$";
    const parts = [sentences[0] + ` ${equation}.`, sentences[1] + ` ${display}.`];
    expect(prosePoints(parts.join(" "))).toEqual(parts);
    expect(prosePoints(sentences.join(" ") + " $unfinished math.")).toHaveLength(1);
  });
  it.each(["Physics", "Chemistry", "Mathematics", "Biology", "English", "History"])("makes long %s notes into individually pageable points", subject => {
    const sections = [{heading: `${subject} reference notes`, kind: "bullets", lines: [sentences.join(" ")]}];
    expect(toNoteBlocks(sections).map(block => block.lines[0])).toEqual(sentences);
    const pages = paginateNoteSections(sections, 6);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flatMap(page => page.flatMap(section => section.lines))).toEqual(sentences);
    expect(guidedGroups(sections as any).flatMap(group => group.lines)).toEqual(sentences);
  });
  it("keeps formulas and derivation lines whole even if they contain long sentences", () => {
    const formula = `**Formula:** $P=IV=I^2R$ ${sentences.join(" ")}`;
    const derivation = `**Derivation step 1:** ${sentences.join(" ")}`;
    expect(prosePoints(formula)).toEqual([formula]);
    expect(prosePoints(derivation)).toEqual([derivation]);
    expect(toNoteBlocks([{heading:"Formula section", kind:"bullets", lines:[sentences.join(" ")]}])[0].lines).toEqual([sentences.join(" ")]);
  });
});
