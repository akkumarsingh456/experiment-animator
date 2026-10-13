import { describe, expect, it } from "vitest";
import { screenshotBookMatches } from "@/lib/reference-books";
import { indexLocalBookPage } from "@/lib/local-book-index";
describe("original screenshots across grades and subjects", () => {
  it.each([["9", "Mathematics", "Polynomials"], ["10", "Science", "Life Processes"], ["12", "Physics", "Current Electricity"]])("indexes %s %s chapters", (klass, subject, chapter) => {
    expect(indexLocalBookPage(subject, `${chapter}\nOriginal topic explanation with labelled details.`, "", klass).chapter).toContain(chapter);
  });
  it("never crosses grades or subjects for ordinary books", () => {
    const book = { class: "Class 9", subject: "Mathematics", file_name: "NCERT Maths.pdf" };
    expect(screenshotBookMatches(book, "9", "Mathematics")).toBe(true);
    expect(screenshotBookMatches(book, "10", "Mathematics")).toBe(false);
    expect(screenshotBookMatches(book, "9", "Physics")).toBe(false);
    expect(screenshotBookMatches(book, "*", "*")).toBe(true);
  });
  it("shares combined senior books only within senior classes", () => {
    const book = { file_name: "BOTANY MED EASY.pdf" };
    expect(screenshotBookMatches(book, "12", "Biology")).toBe(true);
    expect(screenshotBookMatches(book, "9", "Biology")).toBe(false);
    expect(screenshotBookMatches(book, "12", "Physics")).toBe(false);
  });
});