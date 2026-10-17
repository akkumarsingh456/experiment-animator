import { splitReferenceContent } from "@/lib/reference-visuals";
import { isContentsListing } from "@/lib/note-source-noise";
const key = (value: string) => value.toLowerCase().replace(/^chapter\s*\d+\s*[:.\-]?\s*/i, "").replace(/\s*\((?:physics|chemistry|biology|history|geography|political science|economics)\)\s*$/i, "").replace(/^the\s+/, "").replace(/[^\p{L}\p{N}]/gu, "").replace(/^chemicalthermodynamics$/, "thermodynamics").replace(/^systemsofparticles/, "systemofparticles");

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
  // Flattened legacy PDFs have no heading lines. Recover a chapter only from
  // explicit contents page numbers plus a consistent printed-page offset.
  const patterns = titles.map(title=>({title,pattern:new RegExp(title.toLowerCase().replace(/[^a-z0-9]/g,"").split("").join("[\\s\\p{P}]*")+"[^0-9]{0,100}?(\\d{1,3})(?=\\s|$)","iu")}));
  const decoded = (text:string)=>text.replace(/[\uF020-\uF07E]/g,char=>String.fromCharCode(char.charCodeAt(0)-0xF000));
  const entries = new Map<string,{title:string;start:number}>();
  for(const page of pages.slice(0,20)) {
    const text=decoded(page.text);
    const hits=patterns.flatMap(({title,pattern})=>{const match=text.match(pattern);return match?[{title,start:Number(match[1])}]:[]});
    if(hits.length>=3 || /\bcontents\b/i.test(text)) {
      for(const hit of hits)entries.set(hit.title,hit);
      // Omitted legacy chapters still delimit the selected chapter's range.
      for(const segment of text.matchAll(/\b\d{1,2}\.\s+([\s\S]*?)(?=\s+\d{1,2}\.\s+|$)/g)) {
        const printedPage=segment[1].match(/\b(\d{1,3})(?=\s|$)/);
        if(printedPage)entries.set(`boundary:${page.page_number}:${segment.index}`,{title:`boundary:${page.page_number}:${segment.index}`,start:Number(printedPage[1])});
      }
      for(const section of text.matchAll(/([A-Z](?:[A-Z ]|[–-]){5,})\s+(\d{1,3})\s*[–-]\s*\d{1,3}/g))entries.set(`section:${page.page_number}:${section.index}`,{title:`section:${page.page_number}:${section.index}`,start:Number(section[2])});
    }
  }
  const toc = [...entries.values()].sort((a,b)=>a.start-b.start);
  const entry = toc.find(row => normalize(row.title) === wanted);
  if (entry) {
    const offsets = new Map<number,number>();
    for (const page of pages) {
      const head=decoded(page.text.slice(0,200));
      const header = head.match(/^\s*(?:(\d{1,3})(?:\s*\/|\s+(?=[A-Z]))|[A-Za-z][^/]{1,100}\/\s*(\d{1,3})(?=\s|$))/);
      const compact=normalize(head);
      const title=patterns.find(row=>compact.startsWith(normalize(row.title)));
      const printed = Number(header?.[1] || header?.[2] || (title ? compact.slice(normalize(title.title).length).match(/^(\d{1,3})(?=[a-z])/i)?.[1] : undefined));
      if (printed) offsets.set(page.page_number-printed,(offsets.get(page.page_number-printed)||0)+1);
    }
    const offset = [...offsets].sort((a,b)=>b[1]-a[1])[0];
    if (offset && offset[1]>=3) {
      const next = toc.find(row=>row.start>entry.start);
      const range = pages.filter(page=>page.page_number>=entry.start+offset[0] && (!next || page.page_number<next.start+offset[0]));
      if(range.length) return range.map(page=>splitReferenceContent(page.text).text);
    }
  }
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

/** Match flattened/spaced PDF headings; chapter markers also stop omitted legacy chapters. */
export function scopeSocialChapterPages(pages: Array<{page_number:number;text:string}>, chapter:string, titles:string[]):string[]{
 const normalize=(s:string)=>s.replace(/[\uF020-\uF07E]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xF000)).toLowerCase().replace(/[^a-z]/g,"");
 const aliases:Record<string,string[]>={"The Rise of Nationalism in Europe":["Nationalism in Europe"],"Print Culture and the Modern World":["Print Culture"]};
 const wanted=normalize(chapter),names=[...new Set(titles)].flatMap(title=>[title,...(aliases[title]||[])].map(alias=>({title,key:normalize(alias)}))).sort((a,b)=>b.key.length-a.key.length);
 let active=false;const out:string[]=[];
 for(const page of [...pages].sort((a,b)=>a.page_number-b.page_number)){
  const text=splitReferenceContent(page.text).text.replace(/^\[SOURCE_OCR_PAGE\]\s*/,"");
  if(!text.trim()||/^\s*(?:contents|table of contents)\b/i.test(text)||((text.match(/\bchapter\s+(?:\d+|[ivx]+)\b/gi)||[]).length>=3&&!/o\s*verview/i.test(text)))continue;
  const head=text.slice(0,320),tail=text.slice(-300);
  const headKey=normalize(head).replace(/^(?:democraticpolitics|indiaandthecontemporaryworld|contemporaryindia)/,"").replace(/^chapter(?:iv|iii|ii|i|v|vi|vii|viii|ix|x)?/,"");
  let hit=names.find(row=>headKey.startsWith(row.key));
  // Overview-first pages put their chapter label at the bottom of the page.
  if(!hit && /\bCHAPTER\s+(?:\d+|[IVX]+)\b/.test(tail))hit=names.find(row=>normalize(tail).includes(row.key));
  if(!hit && /\bCHAPTER\s+(?:\d+|[IVX]+)\b/.test(head))hit=names.find(row=>normalize(head).includes(row.key));
  // Economics chapter labels survive even when duplicated display-font headings do not.
  if(!hit && titles.includes("Money and Credit") && !titles.includes("Nationalism in India")){const opening=/^notesforteacher/.test(normalize(text.slice(0,160)))?text:text.slice(0,1800);const number=opening.match(/\bCHAPTER\s+([1-5]|IV|III|II|I|V)\b/)?.[1];if(number){const index=/^[1-5]$/.test(number)?Number(number):["I","II","III","IV","V"].indexOf(number)+1;const title=["Development","Sectors of the Indian Economy","Money and Credit","Globalisation and the Indian Economy","Consumer Rights"][index-1];hit=names.find(row=>row.title===title);}}
  if(hit)active=normalize(hit.title)===wanted;
  else if(/\bchapter\s+(?:\d+|[ivx]+)\b.{0,160}\bo\s*verview\b/i.test(head)||/\bchapter\s+(?:\d+|[ivx]+)\s+[A-Z][A-Za-z ]{4,}\s+20\d{2}/.test(tail))active=false;
  if(/^(?:appendix|suggestedreadings|bibliography)/.test(normalize(head)))active=false;
  if(active)out.push(text);
 }
 return out.length?out:scopeEnglishChapterPages(pages,chapter,titles);
}

/** The Hindi/Sanskrit catalog selects named volumes, not interchangeable books. */
export function languageVolumeMatches(book:{file_name?:string|null;chapter?:string|null},chapter:string):boolean {
 const aliases:Record<string,string>={"क्षितिज":"kshitij","कृतिका":"kritika","अंतरा":"antra","अंतराल":"antral","आरोह":"aaroh","वितान":"vitan","शेमुषी":"shemushi","भास्वती":"bhaswati"};
 const name=Object.keys(aliases).sort((a,b)=>b.length-a.length).find(label=>chapter.startsWith(label));
 if(!name)return false;
 const volume=chapter.match(/भाग\s*(\d+)/)?.[1];
 if(!volume)return false;
 const metadata=`${book.file_name||""} ${book.chapter||""}`.toLowerCase().replace(/[_-]+/g," ");
 return new RegExp(`\\b${aliases[name]}\\s+(?:bhag\\s+)?${volume}\\b`).test(metadata)||metadata.includes(`${name} भाग ${volume}`);
}
