import { it, expect } from "vitest";
import { addBlankTeacherSlide, deleteBlankTeacherSlide } from "@/lib/blank-teacher-slide";
import { hasMeaningfulSlide } from "@/lib/slide-space-organizer";
import { paginateLectureSections } from "@/lib/lecture-pages";
import type { Slide } from "@/lib/generate.functions";
it("adds an empty ordinary content slide without copying source notes or saved images", () => {
  const source = {
    title: "Missing topic",
    kind: "content",
    visual: "book",
    topic_recovery: { status: "missing" },
    bullets: ["Existing point"],
    notes: [],
    key_terms: [],
    reference_visuals: [{ url: "old-image" }],
  } as Slide;
  const next = {
    title: "Working topic",
    kind: "content",
    visual: "book",
    bullets: ["Keep this"],
    notes: [],
    key_terms: [],
  } as Slide;
  const original = [source, next];
  const result = addBlankTeacherSlide(original, source.title);
  expect(result.index).toBe(1);
  expect(result.slides[0]).toBe(source);
  expect(result.slides[2]).toBe(next);
  expect(original).toHaveLength(2);
  const blank = result.slides[1];
  expect(blank.kind).toBe("content");
  expect(blank.visual).toBe("book");
  expect(blank.bullets).toEqual([""]);
  expect(blank.sections).toEqual([]);
  expect(blank.reference_visuals).toBeUndefined();
  expect(blank.topic_recovery).toBeUndefined();
  expect(hasMeaningfulSlide(blank)).toBe(true);
  expect(paginateLectureSections(blank.sections)).toHaveLength(1);
  const second = addBlankTeacherSlide(result.slides, source.title);
  expect(second.slides[2].title).not.toBe(blank.title);
});
it("does not add slides for an unaffected topic", () => {
  const slides = [{ title: "Complete topic" } as Slide];
  expect(addBlankTeacherSlide(slides, "Complete topic").slides).toBe(slides);
});

it("deletes only marked newly added slides and never an ordinary slide with a similar title", () => {
  const original = {
    title: "Original topic",
    topic_recovery: { status: "missing" },
    bullets: [],
    notes: [],
    key_terms: [],
    visual: "book",
  } as Slide;
  const first = addBlankTeacherSlide([original], original.title);
  const id = first.slides[1].teacher_blank!.id;
  expect(deleteBlankTeacherSlide(first.slides, "unknown")).toBe(first.slides);
  const removed = deleteBlankTeacherSlide(first.slides, id);
  expect(removed).toEqual([original]);
  expect(removed[0]).toBe(original);
  const replacement = addBlankTeacherSlide(removed, original.title);
  expect(replacement.slides[1].teacher_blank!.id).not.toBe(id);
  expect(replacement.slides[1].teacher_blank!.topic).toBe(original.title);
});
