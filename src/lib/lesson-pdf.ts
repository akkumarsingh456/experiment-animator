import { exportFontCss } from "@/lib/export-fonts";
import { prepareExportImages } from "@/lib/export-images";
/** Split a long rendered worksheet at block boundaries, without losing content. */
export function worksheetSlices(height: number, pageHeight: number, boundaries: number[], protectedRanges: Array<[number, number]> = []): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  let start = 0;
  while (start < height) {
    const limit = Math.min(height, start + pageHeight);
    const candidates = boundaries.filter((b) => b > start + pageHeight * .45 && b <= limit && !protectedRanges.some(([top, bottom]) => top < b - 1 && bottom > b + 1));
    const end = limit === height ? height : candidates.length ? Math.max(...candidates) : limit;
    result.push([start, end]); start = end;
  }
  return result;
}

export async function downloadLessonPdf(root: HTMLElement, mode: "notes" | "slides", title: string, options?: { onProgress?: (done: number, total: number) => void; onReady?: (blob: Blob, filename: string) => void }) {
  const [{ jsPDF }, { toCanvas }] = await Promise.all([import("jspdf"), import("html-to-image")]);
  await document.fonts.ready;
  await prepareExportImages(root);
  // Expand revision panels in the export copy only.
  root.querySelectorAll("details").forEach((node) => { node.open = true; });
  const fontEmbedCSS = await exportFontCss(root);
  const pdf = new jsPDF({ orientation: mode === "notes" ? "portrait" : "landscape", unit: "mm", format: "a4", compress: true });
  const width = pdf.internal.pageSize.getWidth(), height = pdf.internal.pageSize.getHeight();
  const margin = 12, usableWidth = width - 2 * margin, usableHeight = height - 2 * margin - 7;
  const pages = Array.from(root.querySelectorAll<HTMLElement>(mode === "notes" ? ".guided-topic" : ".lesson-export-slide"));
  if (!pages.length) throw new Error("No lesson pages are available to export.");
  let count = 0;
  let rendered = 0;
  options?.onProgress?.(0, pages.length);
  for (const page of pages) {
    const canvas = await toCanvas(page, { pixelRatio: 1.5, backgroundColor: "#ffffff", cacheBust: false, fontEmbedCSS });
    const pagePx = usableHeight / usableWidth * canvas.width;
    const rect = page.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const blocks = Array.from(page.querySelectorAll<HTMLElement>("p, li, tr, figure, h2, h3, summary")).map((node) => node.getBoundingClientRect()).map((r) => [(r.top - rect.top) * scale, (r.bottom - rect.top) * scale] as [number, number]);
    const slices = mode === "slides" ? [[0, canvas.height] as [number, number]] : worksheetSlices(canvas.height, pagePx, blocks.flat(), blocks);
    for (const [start, end] of slices) {
      if (count++) pdf.addPage();
      const crop = document.createElement("canvas"); crop.width = canvas.width; crop.height = Math.ceil(end - start);
      const ctx = crop.getContext("2d"); if (!ctx) throw new Error("PDF rendering is unavailable.");
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, crop.width, crop.height);
      ctx.drawImage(canvas, 0, start, canvas.width, end - start, 0, 0, crop.width, end - start);
      const factor = Math.min(usableWidth / crop.width, usableHeight / crop.height);
      const drawWidth = crop.width * factor, drawHeight = crop.height * factor;
      pdf.addImage(crop.toDataURL("image/jpeg", 0.9), "JPEG", margin, margin, drawWidth, drawHeight, undefined, "FAST");
      // Retain clickable official resource links in the rendered PDF.
      page.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
        const r = link.getBoundingClientRect();
        const top = (r.top - rect.top) * scale;
        const bottom = (r.bottom - rect.top) * scale;
        if (top >= start && bottom <= end) pdf.link(margin + (r.left - rect.left) * scale * factor, margin + (top - start) * factor, r.width * scale * factor, r.height * scale * factor, { url: link.href });
      });
      pdf.setFontSize(8); pdf.setTextColor(90); pdf.text(`${mode === "notes" ? "Guided notes" : "Presentation slides"} · ${count}`, margin, height - 9);
      crop.width = crop.height = 0;
      // Give the browser a chance to update export progress and remain responsive.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    canvas.width = canvas.height = 0;
    options?.onProgress?.(++rendered, pages.length);
  }
  const filename = `${title.replace(/[<>:"/\\|?*]/g, "-") || "lesson"}-${mode === "notes" ? "guided-notes" : "presentation-slides"}.pdf`;
  if (options?.onReady) options.onReady(pdf.output("blob"), filename);
  else pdf.save(filename);
}
