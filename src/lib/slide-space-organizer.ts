import type { Slide } from "./generate.functions";

/** Presentation-only guard. A title, equation, original PDF or visual is meaningful.
 * Keep unavailable source assets too: missing pictures must remain recoverable.
 */
export function hasMeaningfulSlide(slide: Slide): boolean {
  const text = [
    slide.title,
    slide.caption,
    slide.chapter_text,
    slide.ncert_quote,
    ...(slide.bullets || []),
    ...(slide.notes || []),
    ...(slide.sections || []).flatMap((section) => [section.heading, ...section.lines]),
    ...(slide.key_terms || []).flatMap((term) => [term.term, term.meaning]),
    slide.mcq?.question,
    ...(slide.mcq?.options || []).map((option) => option.text),
    slide.mcq?.explanation,
  ];
  return (
    text.some(
      (value) =>
        typeof value === "string" && value.replace(/[\s\u200B-\u200D\uFEFF]/g, "").length > 0,
    ) ||
    !!slide.teacher_pdf ||
    !!slide.context_illustration ||
    !!slide.reference_visuals?.length ||
    !!slide.flow_graph ||
    !!slide.mermaid_flow?.trim()
  );
}

/** Bounded rhythm, never artificial full-height gaps or unbounded font enlargement. */
export function noteSpaceBalance(available: number, used: number, blocks: number) {
  if (!Number.isFinite(available) || !Number.isFinite(used) || available <= 0 || used <= 0)
    return { gap: 0, inset: 0 };
  const spare = Math.max(0, available - used - 24);
  const gap = Math.min(14, spare / Math.max(1, blocks * 2));
  const remaining = Math.max(0, spare - gap * Math.max(0, blocks - 1));
  return { gap, inset: Math.min(64, remaining * 0.25) };
}

/** DOM-only final pass, shared by guided previews and both slide exporters. */
export function balanceGuidedPage(page: HTMLElement, height: number) {
  if (page.classList.contains("guided-cover")) return;
  const children = Array.from(page.children) as HTMLElement[];
  const actual = children.filter(
    (child) => child.textContent?.trim() || child.querySelector("img,svg,canvas,video,table"),
  );
  if (!actual.length) return;
  const originalPadding = page.style.paddingTop;
  const margins = actual.map((child) => child.style.marginTop);
  const style = getComputedStyle(page);
  const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  const used = actual.reduce(
    (sum, child) =>
      sum +
      child.offsetHeight +
      (parseFloat(getComputedStyle(child).marginTop) || 0) +
      (parseFloat(getComputedStyle(child).marginBottom) || 0),
    0,
  );
  // Do not adjust unmeasurable nodes or dense/overflowing pages.
  if (used <= 0 || used + padding >= height * 0.85) return;
  const balance = noteSpaceBalance(height - padding, used, actual.length);
  for (const child of actual.slice(1))
    child.style.marginTop = `${Math.max(parseFloat(getComputedStyle(child).marginTop) || 0, balance.gap)}px`;
  const top = (parseFloat(style.paddingTop) || 0) + balance.inset;
  page.style.paddingTop = `${top}px`;
  // Undo the adjustment if the final measured page no longer fits.
  if (page.scrollHeight > height) {
    page.style.paddingTop = originalPadding;
    actual.slice(1).forEach((child, index) => (child.style.marginTop = margins[index + 1]));
  }
}
