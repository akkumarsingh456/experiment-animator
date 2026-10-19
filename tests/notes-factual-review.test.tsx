import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { reviewLessonFacts } from "@/lib/notes-factual-review";
import { NotesContentCheck } from "@/components/NotesContentCheck";
import { NCERT_SYLLABUS } from "@/lib/ncert-syllabus";
import type { Slide } from "@/lib/generate.functions";
const slide = (lines: string[]): Slide => ({ title: "Existing topic", bullets: [], notes: [], visual: "", key_terms: [], sections: [{ heading: "Key points", kind: "bullets", lines }] });
const source = (text: string) => [{ book: "Saved matching textbook.pdf", location: "Chapter extract 1", text }];
describe("Independent source review without editing notes", () => {
  it("finds exact source wording without certifying it as universally true", () => {
    const text = "The equilibrium temperature of the sample is 300 kelvin.";
    const result = reviewLessonFacts([slide([text])], source(text));
    expect(result.matched).toBe(1);expect(result.claims[0].reason).toContain("not independent proof");
  });
  it("flags reversed negation even though almost all words overlap", () => {
    const result = reviewLessonFacts([slide(["The equilibrium temperature of the sample is not constant."])], source("The equilibrium temperature of the sample is constant."));
    expect(result.conflicts).toBe(1);expect(result.claims[0].evidence?.text).toContain("is constant");
  });
  it("flags changed numbers without automatically choosing a replacement", () => {
    const result = reviewLessonFacts([slide(["The equilibrium temperature of the sample is 900 kelvin."])], source("The equilibrium temperature of the sample is 300 kelvin."));
    expect(result.conflicts).toBe(1);expect(result.claims[0].text).toContain("900");
  });
  it("does not certify a sentence after a limiting condition is omitted", () => {
    const result = reviewLessonFacts([slide(["The volume of this sample remains constant."])], source("The volume of this sample remains constant only under the stated conditions."));
    expect(result.matched).toBe(0);expect(result.unreviewed).toBe(1);
  });
  it("does not turn every unsupported paraphrase into a falsehood", () => {
    const result = reviewLessonFacts([slide(["The stated conditions determine whether the relationship applies."])], source("A relationship must be used within its stated assumptions."));
    expect(result.unreviewed).toBe(1);expect(result.conflicts).toBe(0);
  });
  it("never uses generated grounding, source-labelled notes or quiz options as independent evidence", () => {
    const text="The equilibrium temperature of the sample is 900 kelvin.";
    const original = slide([text]);original.grounding=text;original.ncert_quote=text;
    original.sections!.push({heading:"Source review — original extraction",kind:"bullets",lines:[text]});
    const quiz={...original,kind:"mcq" as const};
    const result=reviewLessonFacts([original,quiz],[]);
    expect(result.matched).toBe(0);expect(result.unreviewed).toBe(1);expect(result.claims[0].reason).toContain("not used as their own evidence");
  });
  it("does not promote exercise options from the textbook into verified facts", () => {
    const text="The equilibrium temperature of the sample is 900 kelvin.";
    expect(reviewLessonFacts([slide([text])],source(`(a) ${text}`)).matched).toBe(0);
  });
  it("preserves every stored field and duplicate line", () => {
    const item=slide(["The source needs an independent review.","The source needs an independent review."]);
    const before=JSON.stringify(item);const result=reviewLessonFacts([item],[]);
    expect(JSON.stringify(item)).toBe(before);expect(result.claims).toHaveLength(2);
  });
  it("reports image-only pages instead of pretending to inspect them", () => {
    const item={...slide([]),teacher_pdf:{path:"book.pdf",page:1,file_name:"book.pdf"}};
    expect(reviewLessonFacts([item],[])).toMatchObject({imageOnly:1,matched:0});
  });
  it("shows honest scope and preserves existing notes in the interface", () => {
    const text="The source needs an independent review.";const original=slide([text]);
    const before=JSON.stringify(original);
    const html=renderToStaticMarkup(<NotesContentCheck slides={[original]} klass="12" subject="Physics" chapter="Chapter 4: Moving Charges and Magnetism"/>);
    expect(html).toContain("does not prove every statement true");expect(html).toContain("free");expect(JSON.stringify(original)).toBe(before);
  });
  const selected:Record<string,string[]>={"9":["Social Science","Mathematics","Science","Computer Science"],"10":["Social Science","Mathematics","Science","Computer Science"],"11":["Mathematics","Physics","Chemistry","Computer Science"],"12":["Mathematics","Physics","Chemistry","Computer Science"]};
  const chapters=Object.entries(NCERT_SYLLABUS).flatMap(([klass,subjects])=>Object.entries(subjects).filter(([subject])=>selected[klass]?.includes(subject)).flatMap(([subject,entries])=>entries.map(entry=>({klass,subject,...entry}))));
  it.each(chapters)("$klass $subject $chapter cannot pass without independent chapter evidence",({chapter})=>{
    const item={...slide(["This explanation needs independently retrieved source evidence."]),title:chapter};
    expect(reviewLessonFacts([item],[])).toMatchObject({matched:0,unreviewed:1,conflicts:0});
  });
});
