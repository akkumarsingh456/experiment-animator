import { prepareExportImages } from "@/lib/export-images";
import { paginateGuidedArticles, PRESENTATION_WIDTH, PRESENTATION_HEIGHT } from "@/lib/guided-slides";

/** Use the same measured content for the projector, slide PDF and PowerPoint. */
export async function prepareSlideExport(root: HTMLElement) {
  if (root.dataset.presentationStyle === "lovable") {
    root.style.width = `${PRESENTATION_WIDTH}px`;
    await document.fonts.ready;
    await prepareExportImages(root);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const frames = Array.from(root.querySelectorAll<HTMLElement>(":scope > .lesson-export-slide"));
    if (!frames.length) throw new Error("No generated PPT slides are available to export.");
    frames.forEach((frame) => Object.assign(frame.style, { width: `${PRESENTATION_WIDTH}px`, height: `${PRESENTATION_HEIGHT}px`, overflow: "hidden", background: "white", position: "relative" }));
    return frames;
  }
  root.classList.add("guided-slide-deck", "lecture-deck");
  root.style.width = `${PRESENTATION_WIDTH}px`;
  root.querySelectorAll("details").forEach((node) => { node.open = true; });
  await document.fonts.ready;
  await prepareExportImages(root);
  const pages = paginateGuidedArticles(root, PRESENTATION_HEIGHT);
  if (!pages.length) throw new Error("No lesson slides are available to export.");
  const frames = pages.map((page) => {
    const frame = document.createElement("div");
    frame.className = "lesson-export-slide guided-notes";
    Object.assign(frame.style, { width: `${PRESENTATION_WIDTH}px`, height: `${PRESENTATION_HEIGHT}px`, overflow: "hidden", background: "white", position: "relative" });
    frame.appendChild(page); return frame;
  });
  root.replaceChildren(...frames);
  return frames;
}

export async function downloadRenderedPptx(root: HTMLElement, title: string) {
  const [{ default: PptxGenJS }, { toPng, getFontEmbedCSS }] = await Promise.all([import("pptxgenjs"), import("html-to-image")]);
  const pages = await prepareSlideExport(root);
  const fontEmbedCSS = await getFontEmbedCSS(root, { preferredFontFormat: "woff2" });
  const pptx = new PptxGenJS(); pptx.layout = "LAYOUT_WIDE";
  pptx.subject = "Complete lesson notes with rendered LaTeX"; pptx.title = title;
  for (const page of pages) {
    const image = await toPng(page, { pixelRatio: 2, backgroundColor: "#ffffff", fontEmbedCSS });
    const slide = pptx.addSlide();
    // Rendered equations keep fractions, matrices, subscripts and layout intact.
    slide.addImage({ data: image, x: 0, y: 0, w: 13.333333, h: 7.5 });
    slide.addNotes(page.innerText || page.textContent || "");
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  await pptx.writeFile({ fileName: `${title.replace(/[<>:"/\\|?*]/g, "-") || "lesson"}.pptx` });
}
