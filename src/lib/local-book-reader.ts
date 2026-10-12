import type { Worker } from "tesseract.js";

/** One browser worker per reading run, shared by all pages and released on pause. */
export function createLocalBookReader(progress: (message: string) => void = () => {}) {
  let worker: Promise<Worker> | undefined;
  const getWorker = () => worker ||= (async () => {
    progress("Preparing the free book reader. No AI credits are used.");
    const [{ createWorker, PSM }, { default: workerPath }] = await Promise.all([
      import("tesseract.js"), import("tesseract.js/dist/worker.min.js?url"),
    ]);
    const instance = await createWorker("eng", 1, { workerPath, cacheMethod: "write" });
    try { await instance.setParameters({ tessedit_pageseg_mode: PSM.AUTO }); }
    catch (error) { await instance.terminate(); throw error; }
    return instance;
  })();
  return {
    async recognize(image: string, nativeText = ""): Promise<string> {
      const usableText = nativeText.replace(/scanned with.*|oken scanner.*|camscanner.*/gi, "").trim();
      if (usableText.length >= 100) return usableText;
      const instance = await getWorker();
      const { data } = await instance.recognize(image);
      return data.text;
    },
    async recognizeContents(image: string, nativeText = ""): Promise<string> {
      if (nativeText.trim().length >= 100) return nativeText;
      const instance = await getWorker();
      const { PSM } = await import("tesseract.js");
      await instance.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      try {
        const { data } = await instance.recognize(image, {}, { blocks: true });
        const words = (data.blocks || []).flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines.flatMap(line => line.words)));
        const right = Math.max(0, ...words.map(word => word.bbox.x1));
        const ranges = words.filter(word => word.bbox.x0 > right * .55 && /^\d{1,3}[-–—]\d{1,3}[.,]?$/.test(word.text));
        const rows = ranges.map(range => {
          const centre = (range.bbox.y0 + range.bbox.y1) / 2;
          const tolerance = Math.max(12, (range.bbox.y1 - range.bbox.y0) * .9);
          return words.filter(word => Math.abs((word.bbox.y0 + word.bbox.y1) / 2 - centre) < tolerance).sort((a,b)=>a.bbox.x0-b.bbox.x0).map(word=>word.text).join(" ");
        });
        if (/contents|physical chemistry|inorganic chemistry/i.test(data.text)) {
          const bitmap = await createImageBitmap(await (await fetch(image)).blob());
          const w = bitmap.width, h = bitmap.height; bitmap.close();
          const top = Math.floor(h * .12), height = Math.floor(h * .8);
          await instance.setParameters({ tessedit_char_whitelist: "0123456789-–—" });
          const numbers = await instance.recognize(image, { rectangle: { left: Math.floor(w*.83), top, width: Math.floor(w*.16), height } }, { blocks: true });
          await instance.setParameters({ tessedit_char_whitelist: "" });
          const labels = await instance.recognize(image, { rectangle: { left: Math.floor(w*.04), top, width: Math.floor(w*.76), height } }, { blocks: true });
          const labelWords = (labels.data.blocks || []).flatMap(block=>block.paragraphs.flatMap(paragraph=>paragraph.lines.flatMap(line=>line.words)));
          const numberLines = (numbers.data.blocks || []).flatMap(block=>block.paragraphs.flatMap(paragraph=>paragraph.lines));
          const paired = numberLines.flatMap(range => {
            const digits = range.text.replace(/\s/g, "");
            if (!/^\d{1,3}[-–—]\d{1,3}$/.test(digits)) return [];
            const centre = (range.bbox.y0+range.bbox.y1)/2;
            const tolerance = Math.max(18,(range.bbox.y1-range.bbox.y0)*1.3);
            const name = labelWords.filter(word=>Math.abs((word.bbox.y0+word.bbox.y1)/2-centre)<tolerance).sort((a,b)=>a.bbox.x0-b.bbox.x0).map(word=>word.text).join(" ");
            return name ? [`${name} ${digits}`] : [];
          });
          if (paired.length) return paired.join("\n") + "\n" + data.text;
        }
        return rows.length ? rows.join("\n") + "\n" + data.text : data.text;
      } finally { await instance.setParameters({ tessedit_pageseg_mode: PSM.AUTO, tessedit_char_whitelist: "" }); }
    },
    async close() {
      if (worker) {
        try { await (await worker).terminate(); } catch { /* A failed worker has no remaining jobs. */ }
        worker = undefined;
      }
    },
  };
}
