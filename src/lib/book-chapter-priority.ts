import { indexLocalBookPage } from '@/lib/local-book-index';
export type ContentsRange = { chapter: string; start: number; end: number };
export function parseBookContents(subject: string, text: string): ContentsRange[] {
  const result: ContentsRange[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:\d+\s*[.)]?\s*)?(.+?)\s*[.·_\s]+(\d{1,3})\s*[-–—]\s*(\d{1,3})\s*$/);
    if (!match) continue;
    const name = match[1].replace(/\s*[.·_]{2,}.*$/, '').replace(/[.·_]+/g, ' ').trim();
    if (/^(?:physical|inorganic|organic)\s*chemistry\b/i.test(name)) continue;
    // Dotted leaders can become random OCR letters. Match only an exact
    // chapter-name prefix; never use fuzzy prose matching for this index.
    const words=name.split(/\s+/);
    let chapter=indexLocalBookPage(subject,name).chapter;
    for(let end=words.length-1;!chapter && end>0;end--)chapter=indexLocalBookPage(subject,words.slice(0,end).join(' ')).chapter;
    chapter ||= name;
    const start = Number(match[2]), end = Number(match[3]);
    if (chapter && start > 0 && end >= start && end - start < 120) result.push({ chapter, start, end });
  }
  return result;
}
export function canonicalBookChapter(subject: string, chapter: string): string {
  return (indexLocalBookPage(subject, chapter).chapter || chapter.replace(/^chapter\s*\d+\s*[:.-]?\s*/i, '')).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
export function chapterReadingOrder(total: number, start: number, end: number): number[] {
  const priority = Array.from({length: Math.max(0, Math.min(total,end)-Math.max(1,start)+1)},(_,i)=>Math.max(1,start)+i);
  const used = new Set(priority);
  return [...priority,...Array.from({length:total},(_,i)=>i+1).filter(page=>!used.has(page))];
}

export function contentsHeadingMatches(subject: string, text: string, chapter: string): boolean {
  const known = indexLocalBookPage(subject, text).chapter;
  if (known && canonicalBookChapter(subject, known) === canonicalBookChapter(subject, chapter)) return true;
  const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/s$/, "");
  const wanted = compact(chapter);
  return !!wanted && text.split(/\r?\n/).slice(0, 12).some(line => line.length < 100 && compact(line.replace(/^\s*\d+[.)]?\s*/, "")) === wanted);
}
