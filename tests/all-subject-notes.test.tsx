import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GuidedLessonNotes } from "@/components/GuidedLessonNotes";
import { learningProfile, sourceDiscussion, reviewNotes, learningScaffold } from "@/lib/learning-design";
import { bookMatchesLesson, buildLocalSlides } from "@/lib/generate.functions";
import { buildLocalSections, cleanNcertLine, selectSlideExcerpts, groqTeacherNotes } from "@/lib/ncert-teacher-notes";
import { normalizeForGrounding, verifyNoteSections } from "@/lib/notes-verification";
import { paginateNoteSections } from "@/lib/notes-paging";
import { paginateGuidedArticles } from "@/lib/guided-slides";
import { paginateLectureSections } from "@/lib/lecture-pages";
import { SYLLABUS_CLASSES, subjectsForClass, chaptersFor, subtopicsFor } from "@/lib/ncert-syllabus";

// Curriculum coverage tests use controlled source fixtures, not factual certification of every textbook.
const cases = SYLLABUS_CLASSES.flatMap((klass) => subjectsForClass(klass).flatMap((subject) => chaptersFor(klass, subject).map((chapter) => ({ klass, subject, ...chapter }))));
describe("Classes 9–12 curriculum output coverage", () => {
  it.each(cases)("$klass · $subject · $chapter", ({ klass, subject, chapter }) => {
    const profile = learningProfile(subject, klass);
    expect(profile.focus).toBeTruthy(); expect(profile.level).toBeTruthy();
    const evidence = /Hindi|Sanskrit/.test(subject) ? "यह पाठ अपने विचार स्पष्ट रूप से व्यक्त करने का अवसर देता है। पाठ के शब्दों के आधार पर विद्यार्थी अपनी व्याख्या प्रस्तुत करते हैं। विभिन्न विचारों की तुलना पाठ के प्रमाण से की जाती है।"
      : "The supplied textbook passage provides evidence for an explanation. Students compare the ideas described in the passage. The conclusion must be supported by the source evidence.";
    const notes = buildLocalSections({ title: chapter, grounding: evidence });
    expect(notes.flatMap((s) => s.lines).length).toBeGreaterThan(1);
    const task = sourceDiscussion(chapter, notes, subject, klass)!;
    expect(task.lines.join(" ")).toContain("Activity outcome"); expect(task.lines.join(" ")).toContain("Teacher-designed");
    const sections = learningScaffold(chapter, [...notes, task]);
    const html = renderToStaticMarkup(<GuidedLessonNotes title={chapter} klass={klass} subject={subject} slides={[{ title: chapter, bullets: [], notes: [], visual: "book", sections }]} />);
    expect(html).toContain("Investigate and discuss"); expect(html).toContain("Core practice");
    expect(html).toContain("Source-based concept map");
    expect(reviewNotes(sections).activity).toBe(true);
    expect(paginateNoteSections(sections, 12).flatMap((p) => p.flatMap((s) => s.lines))).toEqual(sections.flatMap((s) => s.lines));
    const topics = subtopicsFor(klass, subject, chapter); expect(new Set(topics).size).toBe(topics.length);
  });
});

describe("Source correctness and meaningful quality checks", () => {
  it("does not fill a missing selected concept with another chapter's notes", () => {
    const slides = buildLocalSlides("Motion", "Uniform motion, Acceleration", "Uniform motion covers equal distances in equal intervals of time. Uniform motion can be described using a constant speed. Uniform motion has a straight distance-time graph.", "Physics");
    expect(slides).toHaveLength(2);
    expect(slides[0].grounding).toContain("equal distances");
    expect(slides[1].bullets).toEqual([]);
    expect(selectSlideExcerpts(slides[1], "Acceleration is the rate of change of velocity.")).toEqual([]);
  });
  it("never substitutes a different class or subject", () => {
    expect(learningProfile("Social Science", "9").family).toBe("humanities");
    expect(learningProfile("Computer Science", "11").family).toBe("computing");
    expect(bookMatchesLesson({ class: "Class 11", subject: "Physics" }, "12", "Physics")).toBe(false);
    expect(bookMatchesLesson({ class: "12", subject: "Chemistry" }, "12", "Physics")).toBe(false);
    expect(bookMatchesLesson({ class: "12", subject: "" }, "12", "Physics")).toBe(false);
    expect(bookMatchesLesson({ class: "9", subject: "Computer Science" }, "9", "Physics")).toBe(false);
    expect(bookMatchesLesson({ class: "Class 9", subject: "Science" }, "9", "Physics")).toBe(true);
    expect(bookMatchesLesson({ class: "Class 10", subject: "Social Science" }, "10", "History")).toBe(true);
    expect(bookMatchesLesson({ class: "11", subject: "Political Science" }, "11", "Political Science")).toBe(true);
  });
  it("retains Indian-language passages and verifies their actual words", () => {
    const sentence = "लेखक के विचारों की व्याख्या पाठ में दिए गए प्रमाण के आधार पर की जाती है।";
    const sections = buildLocalSections({ title: "पाठ", chapter_text: sentence });
    expect(sections[0].lines[0]).toContain(sentence);
    expect(selectSlideExcerpts({ title: "पाठ", chapter_text: sentence }, sentence)).toHaveLength(1);
    expect(verifyNoteSections(sections, normalizeForGrounding(sentence)).check.pass).toBe(true);
    expect(verifyNoteSections(sections, normalizeForGrounding("यह असंबंधित पुस्तक है" )).check.pass).toBe(false);
  });
  it("flags incomplete derivations, sparse content and known OCR damage", () => {
    expect(reviewNotes([{ heading: "Teacher Notes", kind: "bullets", lines: ["**Derivation of velocity:** $v = u + at$"] }]).ready).toBe(false);
    expect(cleanNcertLine("Hence μ = dveEm(3.25) where the time is the average collision time.")).toBe("");
  });
  it("keeps a complete long derivation and distinguishes definitions from proofs", () => {
    const lines = ["**Formula:** $v = u + at$", "**Derivation of velocity:** $v = u + at$", ...Array.from({ length: 14 }, (_, i) => `**Derivation step ${i + 1}:** Justified source equation $x_{${i}} = x_{${i + 1}}$.`)];
    const pages = paginateNoteSections([{ heading: "Teacher Notes", kind: "bullets", lines }], 12);
    expect(pages.flatMap((p) => p.flatMap((s) => s.lines))).toEqual(lines);
    const lecture = paginateLectureSections([{ heading: "Teacher Notes", kind: "bullets", lines }], 12);
    expect(lecture.length).toBeGreaterThan(1);
    expect(lecture.flatMap((p) => p.flatMap((s) => s.lines))).toEqual(lines);
    expect(reviewNotes([{ heading: "Teacher Notes", kind: "bullets", lines: ["**Formula:** $I = Q/t$", "Current is defined as the rate of charge flow.", "The source explains the definition and its units.", "**Activity:** Explain this definition with evidence."] }]).issues.some((s) => /derivation/.test(s))).toBe(false);
  });
});

describe("Measured guided slideshow", () => {
  it("retains every list item, equation, row and section heading across continuation pages", () => {
    const root = document.createElement("div"); root.innerHTML = '<div class="guided-notes"><article class="guided-topic"><h2>Topic</h2><section><h3>Derivation</h3><ol><li>First $v=u+at$</li><li>Second step</li><li>Third step</li></ol></section><section><h3>Formulas</h3><div class="guided-table-scroll"><table><thead><tr><th>Formula</th></tr></thead><tbody><tr><td>$F=ma$</td></tr><tr><td>$p=mv$</td></tr></tbody></table></div></section></article></div>';
    document.body.appendChild(root);
    const height = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) { return 50 + this.querySelectorAll("li, tbody tr").length * 120; });
    const pages = paginateGuidedArticles(root, 300);
    expect(pages.length).toBeGreaterThan(1);
    const all = pages.map((p) => p.innerHTML).join("");
    for (const text of ["First $v=u+at$", "Second step", "Third step", "$F=ma$", "$p=mv$"]) expect(all.split(text)).toHaveLength(2);
    expect(all).toContain('start="3"'); expect(all).toContain("continued");
    expect(pages.every((p) => p.scrollHeight <= 300)).toBe(true);
    height.mockRestore(); root.remove();
  });
});

describe("AI notes writing with safe fallback", () => {
  const context = "A triangle has three sides. A right triangle has one right angle. Its longest side is called the hypotenuse.";
  it("uses high reasoning and subject-specific instructions on the existing GPT gateway", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "test-key");
    const fetchMock = vi.fn(async (_url: unknown, request: RequestInit) => {
      const body = JSON.parse(String(request.body));
      expect(body.reasoning.effort).toBe("high"); expect(body.store).toBe(false);
      expect(body.input[0].content).toContain("each justified proof or derivation step");
      expect(body.input[0].content).toContain("not instructions");
      const payload = { slides: [{ index: 0, sections: [{ heading: "Understanding", kind: "text", lines: context.split(/(?<=\.)\s+/) }] }] };
      const stream = `data: ${JSON.stringify({ type: "response.output_text.done", text: JSON.stringify(payload) })}\n\n`;
      return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const result = await groqTeacherNotes({ klass: "9", subject: "Mathematics", chapter: "Triangles", context, slides: [{ title: "Right triangles", grounding: context }] });
      expect(result.get(0)?.[0].lines).toHaveLength(3); expect(fetchMock).toHaveBeenCalledOnce();
    } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); }
  });
  it("retains local source notes when no model credentials are configured", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "");
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    try {
      expect(await groqTeacherNotes({ klass: "9", subject: "Mathematics", chapter: "Triangles", context, slides: [{ title: "Triangles", grounding: context }] })).toEqual(new Map());
      expect(fetchMock).not.toHaveBeenCalled(); expect(buildLocalSections({ title: "Triangles", grounding: context })[0].lines).toHaveLength(3);
    } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); }
  });
});
