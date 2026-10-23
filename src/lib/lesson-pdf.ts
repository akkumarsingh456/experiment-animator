import { exportFontCss } from "@/lib/export-fonts";
import { prepareExportImages } from "@/lib/export-images";
import {appendContinuousNotes} from './continuous-notes-pdf';
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
  if(mode==='notes'){
    await appendContinuousNotes(pdf,pages,page=>toCanvas(page,{pixelRatio:1.5,backgroundColor:'#ffffff',cacheBust:false,fontEmbedCSS}),options?.onProgress);
    const filename=`${title.replace(/[<>:"/\\|?*]/g,'-')||'lesson'}-guided-notes.pdf`;
    if(options?.onReady)options.onReady(pdf.output('blob'),filename);else pdf.save(filename);
    return;
  }
  // Presentation exports retain one landscape PDF page per slide.
  let count=0,rendered=0;
  options?.onProgress?.(0,pages.length);
  for(let offset=0;offset<pages.length;offset+=2){
    const batch=pages.slice(offset,offset+2);
    const canvases=await Promise.all(batch.map(page=>toCanvas(page,{pixelRatio:1.5,backgroundColor:'#ffffff',cacheBust:false,fontEmbedCSS})));
    for(const [index,page] of batch.entries()){
      const canvas=canvases[index];if(count++)pdf.addPage();
      const factor=Math.min(usableWidth/canvas.width,usableHeight/canvas.height);
      pdf.addImage(canvas.toDataURL('image/jpeg',.9),'JPEG',margin,margin,canvas.width*factor,canvas.height*factor,undefined,'FAST');
      const rect=page.getBoundingClientRect(),scale=canvas.width/rect.width;
      page.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(link=>{
        const r=link.getBoundingClientRect();
        pdf.link(margin+(r.left-rect.left)*scale*factor,margin+(r.top-rect.top)*scale*factor,r.width*scale*factor,r.height*scale*factor,{url:link.href});
      });
      pdf.setFontSize(8);pdf.setTextColor(90);pdf.text(`Presentation slides · ${count}`,margin,height-9);
      canvas.width=canvas.height=0;options?.onProgress?.(++rendered,pages.length);
      await new Promise<void>(resolve=>setTimeout(resolve,0));
    }
  }
  const filename=`${title.replace(/[<>:"/\\|?*]/g,'-')||'lesson'}-presentation-slides.pdf`;
  if(options?.onReady)options.onReady(pdf.output('blob'),filename);else pdf.save(filename);
}
