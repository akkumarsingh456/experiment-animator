/** Exact figures cropped from an uploaded book page, never invented structures. */
export type ReferenceVisual = {
  title: string; kind: "reaction" | "structure" | "diagram";
  description: string; page: number; book?: string; book_id?: string; chapter?: string;
  storage_path: string; url?: string; aspect: number;
  crop: { x: number; y: number; width: number; height: number };
  /** Local OCR supports matching only; never show it as replacement note text. */
  capture?: "page";
  match_text?: string;
};
const START = "[REFERENCE_VISUALS_V1]", END = "[/REFERENCE_VISUALS_V1]";
export type ReferenceContext = { chapter: string; visuals_checked?: boolean; reader?: "local"; capture_saved?: boolean; needs_review?: boolean };
export function encodeReferenceVisuals(text: string, visuals: ReferenceVisual[], context?: ReferenceContext): string {
  return text + "\n\n" + START + JSON.stringify(visuals) + END + (context ? "\n[REFERENCE_CONTEXT_V1]" + JSON.stringify(context) + "[/REFERENCE_CONTEXT_V1]" : "");
}
export function splitReferenceContent(content: string): { text: string; visuals: ReferenceVisual[]; context?: ReferenceContext } {
  const visuals: ReferenceVisual[] = [];
  let context: ReferenceContext | undefined;
  const text = content.replace(/\[REFERENCE_CONTEXT_V1\]([\s\S]*?)\[\/REFERENCE_CONTEXT_V1\]/g, (_, json) => {
    try { const value = JSON.parse(json); if (typeof value.chapter === "string") context = {
      chapter: value.chapter.slice(0, 200), ...(value.visuals_checked === true ? { visuals_checked: true } : {}),
      ...(value.reader === "local" ? { reader: "local" as const, capture_saved: value.capture_saved === true, needs_review: value.needs_review === true } : {}),
    }; } catch { /* Ignore invalid indexing metadata. */ }
    return "";
  }).replace(/\[REFERENCE_VISUALS_V1\]([\s\S]*?)\[\/REFERENCE_VISUALS_V1\]/g, (_, json) => {
    try { for (const item of JSON.parse(json)) {
      const c = item.crop;
      if (["reaction", "structure", "diagram"].includes(item.kind) && typeof item.title === "string" && typeof item.storage_path === "string" && !item.storage_path.includes("..") && item.aspect > 0 && c && [c.x,c.y,c.width,c.height].every(Number.isFinite) && c.x >= 0 && c.y >= 0 && c.width > .05 && c.height > .05 && c.x + c.width <= 1.001 && c.y + c.height <= 1.001) visuals.push(item);
    } } catch { /* Preserve surrounding notes when a figure descriptor is invalid. */ }
    return "";
  }).trim();
  return { text, visuals, context };
}
