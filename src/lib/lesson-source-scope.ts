import { splitReferenceContent } from "@/lib/reference-visuals";
import { isContentsListing } from "@/lib/note-source-noise";
const key = (value: string) => value.toLowerCase().replace(/^chapter\s*\d+\s*[:.\-]?\s*/i, "").replace(/^the\s+/, "").replace(/[^\p{L}\p{N}]/gu, "").replace(/^chemicalthermodynamics$/, "thermodynamics");

/** Keep whole chapter pages in order; keyword hits alone can cross chapters. */
export function scopeTextbookPages(pages: Array<{ page_number: number; text: string }>, chapter: string, chapterNames: string[]): string[] {
  const wanted = key(chapter);
  if (!wanted) return [];
  const names = [...new Set([...chapterNames.map(key), wanted])].filter(name => name.length >= 4);
  let current = "";
  const result: string[] = [];
  for (const page of [...pages].sort((a,b) => a.page_number-b.page_number)) {
    const text = splitReferenceContent(page.text).text.replace(/^\[SOURCE_OCR_PAGE\]\s*/, "");
    if (!text.trim() || isContentsListing(text) || /^\s*(?:contents|table of contents)\b/i.test(text)) continue;
    const header = key(text.slice(0, 600));
    const hits = names.map(name => ({ name, at: header.indexOf(name) })).filter(hit => hit.at >= 0).sort((a,b) => a.at-b.at || b.name.length-a.name.length);
    if (hits.length) current = hits[0].name;
    if (current === wanted) result.push(text);
  }
  return result;
}

/** OCR describes the actual saved picture; it is formula evidence, not prose notes. */
export function referenceFormulaEvidence(content: string, chapter: string): string {
  const source = splitReferenceContent(content);
  if (source.context?.chapter && key(source.context.chapter) !== key(chapter)) return "";
  const indexes = source.visuals.filter(visual => key(visual.chapter || source.context?.chapter || "") === key(chapter))
    .map(visual => visual.capture === "page" ? visual.match_text || "" : `${visual.title}: ${visual.description}`);
  return [source.text, ...indexes].filter(Boolean).join("\n\n");
}

/** English headings delimit individual stories/poems, including shared PDF pages. */
export function scopeEnglishChapterPages(pages: Array<{page_number: number; text: string}>, chapter: string, titles: string[]): string[] {
  const normalize = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
  const wanted = normalize(chapter);
  const aliases: Record<string, string[]> = {
    "Nelson Mandela – Long Walk to Freedom": ["Nelson Mandela", "Long Walk to Freedom"],
    "Two Stories about Flying": ["Stories About Flying"],
    "We’re Not Afraid to Die… if We Can All Be Together": ["We're Not Afraid to Die", "We're Not Afraid to Die if We Can Be Together"],
  };
  const titleKeys = titles.flatMap(title => [title, ...(aliases[title] || [])].map(label => ({title, key: normalize(label)})));
  let active = false;
  const result: string[] = [];
  for (const page of [...pages].sort((a,b) => a.page_number - b.page_number)) {
    const text = splitReferenceContent(page.text).text.replace(/^\[SOURCE_OCR_PAGE\]\s*/, "");
    if (!text.trim() || isContentsListing(text) || /^\s*(contents|table of contents)\b/i.test(text)) continue;
    const lines = text.split(/\r?\n/);
    let buffer: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      // Headings can wrap onto two lines; require a whole heading rather than a mention in prose.
      const single = normalize(lines[i].replace(/^\s*(?:chapter\s*)?\d+[.):-]?\s*/i, ""));
      const double = normalize(lines[i] + " " + (lines[i+1] || ""));
      const hit = titleKeys.find(t => single === t.key || double === t.key);
      if (hit) {
        if (active && buffer.length) result.push(buffer.join("\n"));
        buffer = [];
        active = normalize(hit.title) === wanted;
      }
      if (active) buffer.push(lines[i]);
    }
    if (active && buffer.length) result.push(buffer.join("\n"));
  }
  return result;
}

/** Social textbooks often flatten an entire page, including its running title. */
export function scopeSocialChapterPages(pages: Array<{page_number:number;text:string}>, chapter:string, titles:string[]):string[]{
 const escaped=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
 const patterns=titles.map(title=>({title,pattern:new RegExp("^\\s*(?:(?:chapter\\s*)?[0-9ivxlcdm]+[.):\\-]?\\s+)?"+title.split(/\s+/).map(escaped).join("\\s+")+"(?=\\s|$)","i")}));
 let active=false;const out:string[]=[];
 for(const page of [...pages].sort((a,b)=>a.page_number-b.page_number)){
  const text=splitReferenceContent(page.text).text.replace(/^\[SOURCE_OCR_PAGE\]\s*/,"");
  if(!text.trim()||isContentsListing(text)||/^\s*(?:contents|table of contents)\b/i.test(text))continue;
  const hit=patterns.find(row=>row.pattern.test(text.slice(0,250)));
  if(hit)active=key(hit.title)===key(chapter);
  if(active)out.push(text);
 }
 return out.length?out:scopeEnglishChapterPages(pages,chapter,titles);
}
