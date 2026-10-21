import type { Slide } from "./generate.functions";
/** User-requested empty content slide. Reuse the ordinary canvas and image tools. */
export function addBlankTeacherSlide(slides: Slide[], topic: string) {
  const source = slides.findIndex((slide) => slide.title === topic && slide.topic_recovery);
  if (source < 0) return { slides, index: -1 };
  const prefix = `${topic} — Teacher slide `;
  let number = 1;
  while (slides.some((slide) => slide.title === prefix + number)) number++;
  let index = source + 1;
  while (index < slides.length && slides[index].title.startsWith(prefix)) index++;
  const blank: Slide = {
    title: prefix + number,
    kind: "content",
    visual: "book",
    bullets: [""],
    notes: [],
    key_terms: [],
    sections: [],
    caption: "Teacher notes",
  };
  return { slides: [...slides.slice(0, index), blank, ...slides.slice(index)], index };
}
