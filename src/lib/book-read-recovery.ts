/** Retry only interrupted, idempotent book-reading requests; honour an explicit pause. */
export async function retryBookRead<T>(read: () => Promise<T>, options: {
  stopped?: () => boolean;
  progress?: (message: string) => void;
  label: string;
}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    if (options.stopped?.()) throw new Error("Reference-book reading paused. Completed pages are saved.");
    try { return await read(); }
    catch (error) {
      if (options.stopped?.()) throw new Error("Reference-book reading paused. Completed pages are saved.");
      const message = error && typeof error === "object" && "message" in error ? String(error.message) : String(error);
      const interrupted = /client cancel(?:led|ed)|abort|failed to fetch|network|timed?\s*out|timeout|connection.*(?:closed|reset)/i.test(message);
      if (!interrupted) throw error;
      if (attempt >= 2) throw new Error(`${options.label} was interrupted repeatedly. Select Read / resume to continue; completed pages are saved.`);
      options.progress?.(`${options.label}: connection interrupted. Reconnecting (${attempt + 1}/2); completed pages are saved…`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}
