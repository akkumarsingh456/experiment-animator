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
    async close() {
      if (worker) {
        try { await (await worker).terminate(); } catch { /* A failed worker has no remaining jobs. */ }
        worker = undefined;
      }
    },
  };
}
