import { exportFontCss } from "@/lib/export-fonts";
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

export async function downloadRenderedPptx(root: HTMLElement, title: string, options?: { onProgress?: (done: number, total: number) => void; onReady?: (blob: Blob, filename: string) => void }) {
  const [{ default: PptxGenJS }, { toJpeg }] = await Promise.all([import("pptxgenjs"), import("html-to-image")]);
  const pages = await prepareSlideExport(root);
  const fontEmbedCSS = await exportFontCss(root);
  const pptx = new PptxGenJS(); pptx.layout = "LAYOUT_WIDE";
  pptx.subject = "Complete lesson notes with rendered LaTeX"; pptx.title = title;
  options?.onProgress?.(0, pages.length);
  let completed = 0;
  for (let offset = 0; offset < pages.length; offset += 2) {
    const batch = pages.slice(offset, offset + 2);
    const images = await Promise.all(batch.map(page => toJpeg(page, { pixelRatio: 1.5, quality: 0.9, backgroundColor: "#ffffff", fontEmbedCSS })));
    for (const [index, page] of batch.entries()) {
    const image = images[index];
    const slide = pptx.addSlide();
    // Rendered equations keep fractions, matrices, subscripts and layout intact.
    slide.addImage({ data: image, x: 0, y: 0, w: 13.333333, h: 7.5 });
    slide.addNotes(page.innerText || page.textContent || "");
    options?.onProgress?.(++completed, pages.length);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  }
  const filename = `${title.replace(/[<>:"/\\|?*]/g, "-") || "lesson"}.pptx`;
  if (options?.onReady) options.onReady(await pptx.write({ outputType: "blob" }) as Blob, filename);
  else await pptx.writeFile({ fileName: filename });
}
