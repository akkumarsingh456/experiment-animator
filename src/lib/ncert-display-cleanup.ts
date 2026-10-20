import type { Slide } from "./generate.functions";
import { mapOutsideMath } from "./latex-notation";
import { NCERT_SYLLABUS } from "./ncert-syllabus";

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const titles = Array.from(new Set([
  "Physics", "Chemistry", "Science", "Mathematics", "Biology", "Computer Science",
  "Democratic Politics", "Contemporary India", "India and the Contemporary World", "Economics",
  "Understanding Economic Development",
  ...Object.values(NCERT_SYLLABUS).flatMap(subjects => Object.values(subjects).flatMap(chapters =>
    chapters.map(chapter => chapter.chapter.replace(/^Chapter\s+\d+\s*:\s*/i, "")))),
])).filter(title => /^[A-Za-z]/.test(title)).sort((a, b) => b.length - a.length);
const title = `(?:${[...new Set(titles.flatMap(value=>[value,value.replace(/\s*\((?:Physics|Chemistry|Biology)\)\s*$/i,'')]))].sort((a,b)=>b.length-a.length).map(value=>escape(value).replace(/[A-Za-z]/g,'$&[ \\t]*')).join("|")})`;
const edition = String.raw`20\d{2}\s*[-–]\s*(?:20)?\d{2}`;
// Require an edition, a page number and a recognised running title together.
// Isolated dates, scientific values, references and bare numbers are never removed.
const headers = [
  new RegExp(String.raw`\b${edition}\s+\d{1,3}\s+${title}(?![A-Za-z0-9])`, "gi"),
  new RegExp(String.raw`\b${edition}\s+${title}\s+\d{1,3}\b`, "gi"),
  new RegExp(String.raw`\b\d{1,3}\s+${title}\s+${edition}\b`, "gi"),
  new RegExp(String.raw`\b${title}\s+\d{1,3}\s+${edition}\b`, "gi"),
];

/** View only: remove confirmed print furniture and accidental adjacent function
 * words. Keep source-review originals, mathematical spans, code and quotations.
 */
export function cleanNcertDisplayText(raw: string, sectionHeading = ""): string {
  if (/^Source (?:review|table)\b/i.test(sectionHeading) || /\b(?:code|program|algorithm|syntax|trace|output|quotation)\b/i.test(sectionHeading)
    || /^\s*\*\*(?:code|program|algorithm|syntax|output):\*\*/i.test(raw)) return raw;
  return mapOutsideMath(raw, text => text.split(/(```[\s\S]*?```|`[^`\n]*`|"[^"\n]*"|“[^”\n]*”|'[^'\n]*'|‘[^’\n]*’)/g)
    .map((part, index) => {
      if (index % 2) return part;
      let result = part;
      for (const header of headers) result = result.replace(header, "");
      result = result.replace(/\b(the|and|of|to|for|with|from)(?:[ \t]+\1\b)+/gi, "$1");
      // Only collapse whitespace introduced by a confirmed correction.
      return result === part ? part : result.replace(/[ \t]{2,}/g, " ");
    }).join(""));
}


/** Shared presentation boundary for slides, concept maps and recap views. */
export function ncertNotesDisplaySlide(slide: Slide, subject?: string): Slide {
  if (slide.teacher_pdf || slide.kind === "mcq" || !/^(?:Science|Physics|Chemistry|Mathematics|Social Science|Computer Science)$/i.test(subject || "")) return slide;
  return {
    ...slide,
    bullets: slide.bullets?.map(line => cleanNcertDisplayText(line)) || [],
    notes: slide.notes?.map(line => cleanNcertDisplayText(line)) || [],
    chapter_text: slide.chapter_text ? cleanNcertDisplayText(slide.chapter_text) : slide.chapter_text,
    sections: slide.sections?.map(section => section.kind === "diagram" || /^Source (?:review|table)\b/i.test(section.heading)
      ? section : { ...section, lines: section.lines.map(line => cleanNcertDisplayText(line, section.heading)) }),
  };
}
