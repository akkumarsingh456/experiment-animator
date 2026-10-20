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
  // Overlap image decoding for two pages, while bounding memory and preserving slide order.
  for (let offset = 0; offset < pages.length; offset += 2) {
    const batch = pages.slice(offset, offset + 2);
    const canvases = await Promise.all(batch.map(page => toCanvas(page, { pixelRatio: 1.5, backgroundColor: "#ffffff", cacheBust: false, fontEmbedCSS })));
    for (const [index, page] of batch.entries()) {
    const canvas = canvases[index];
    const teacherGuide=mode==='notes'&&page.matches('.guided-planner, .guided-teacher-topic');
    const headerSpace=teacherGuide?8:0;
    const bodyHeight=usableHeight-headerSpace;
    const pagePx = bodyHeight / usableWidth * canvas.width;
    const rect = page.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const blocks = Array.from(page.querySelectorAll<HTMLElement>("p, li, tr, figure, h2, h3, summary")).map((node) => node.getBoundingClientRect()).map((r) => [(r.top - rect.top) * scale, (r.bottom - rect.top) * scale] as [number, number]);
    if(teacherGuide){
      // Keep a teacher-section heading with its first paragraph/list item.
      // This affects teacher guide pages only; never alter student-note paging.
      page.querySelectorAll<HTMLElement>('h2,h3').forEach(heading=>{
        const next=heading.nextElementSibling as HTMLElement|null;
        if(!next)return;
        const first=next.matches('ul,ol')?next.firstElementChild as HTMLElement|null:next;
        if(!first)return;
        const top=(heading.getBoundingClientRect().top-rect.top)*scale,bottom=(first.getBoundingClientRect().bottom-rect.top)*scale;
        if(bottom-top<pagePx*.85)blocks.push([top,bottom]);
      });
    }
    const slices = mode === "slides" ? [[0, canvas.height] as [number, number]] : worksheetSlices(canvas.height, pagePx, blocks.flat(), blocks);
    for (const [start, end] of slices) {
      if (count++) pdf.addPage();
      const crop = document.createElement("canvas"); crop.width = canvas.width; crop.height = Math.ceil(end - start);
      const ctx = crop.getContext("2d"); if (!ctx) throw new Error("PDF rendering is unavailable.");
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, crop.width, crop.height);
      ctx.drawImage(canvas, 0, start, canvas.width, end - start, 0, 0, crop.width, end - start);
      const factor = Math.min(usableWidth / crop.width, bodyHeight / crop.height);
      const drawWidth = crop.width * factor, drawHeight = crop.height * factor;
      if(teacherGuide){
        pdf.setFontSize(8);pdf.setTextColor(60,85,100);
        const heading=page.querySelector('h2')?.textContent?.trim()||'Teaching plan';
        let label=`Teacher guide · ${heading}${start>0?' · continued':''}`;
        while(label.length>20&&pdf.getTextWidth(label)>usableWidth)label=label.slice(0,-2);
        pdf.text(label,margin,margin+3);
      }
      pdf.addImage(crop.toDataURL("image/jpeg", 0.9), "JPEG", margin, margin+headerSpace, drawWidth, drawHeight, undefined, "FAST");
      // Retain clickable official resource links in the rendered PDF.
      page.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
        const r = link.getBoundingClientRect();
        const top = (r.top - rect.top) * scale;
        const bottom = (r.bottom - rect.top) * scale;
        if (top >= start && bottom <= end) pdf.link(margin + (r.left - rect.left) * scale * factor, margin+headerSpace + (top - start) * factor, r.width * scale * factor, r.height * scale * factor, { url: link.href });
      });
      pdf.setFontSize(8); pdf.setTextColor(90); pdf.text(`${mode === "notes" ? "Guided notes" : "Presentation slides"} · ${count}`, margin, height - 9);
      crop.width = crop.height = 0;
      // Give the browser a chance to update export progress and remain responsive.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    canvas.width = canvas.height = 0;
    options?.onProgress?.(++rendered, pages.length);
  }
  }
  const filename = `${title.replace(/[<>:"/\\|?*]/g, "-") || "lesson"}-${mode === "notes" ? "guided-notes" : "presentation-slides"}.pdf`;
  if (options?.onReady) options.onReady(pdf.output("blob"), filename);
  else pdf.save(filename);
}
