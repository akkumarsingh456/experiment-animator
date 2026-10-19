import { loadManualBookLinks } from "./manual-book-links.functions";
type Request = { klass: string; subject: string; chapter: string; topic: string };
const cache = new Map<string, { expires: number; promise: ReturnType<typeof loadManualBookLinks> }>();
/** Share pending lookups between slide panels, then reuse results for one minute. */
export function cachedManualBookLinks(data: Request) {
  const key = JSON.stringify([data.klass, data.subject, data.chapter, data.topic]);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise;
  const entry = { expires: Date.now() + 60000, promise: loadManualBookLinks({ data }) };
  entry.promise = entry.promise.then(result => {
    // Recheck empty/missing chapter indexes soon while preparation is in progress.
    if (!result.some(book => book.pages.length)) entry.expires = Date.now() + 5000;
    return result;
  }).catch(error => { if (cache.get(key) === entry) cache.delete(key); throw error; });
  cache.set(key, entry);
  if (cache.size > 60) cache.delete(cache.keys().next().value!);
  return entry.promise;
}
