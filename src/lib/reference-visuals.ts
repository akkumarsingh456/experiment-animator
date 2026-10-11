/** Exact figures cropped from an uploaded book page, never invented structures. */
export type ReferenceVisual = {
  title: string; kind: "reaction" | "structure" | "diagram";
  description: string; page: number; book?: string; book_id?: string;
  storage_path: string; url?: string; aspect: number;
  crop: { x: number; y: number; width: number; height: number };
};
const START = "[REFERENCE_VISUALS_V1]", END = "[/REFERENCE_VISUALS_V1]";
export function encodeReferenceVisuals(text: string, visuals: ReferenceVisual[]): string {
  return text + "\n\n" + START + JSON.stringify(visuals) + END;
}
export function splitReferenceContent(content: string): { text: string; visuals: ReferenceVisual[] } {
  const visuals: ReferenceVisual[] = [];
  const text = content.replace(/\[REFERENCE_VISUALS_V1\]([\s\S]*?)\[\/REFERENCE_VISUALS_V1\]/g, (_, json) => {
    try { for (const item of JSON.parse(json)) {
      const c = item.crop;
      if (["reaction", "structure", "diagram"].includes(item.kind) && typeof item.title === "string" && typeof item.storage_path === "string" && !item.storage_path.includes("..") && item.aspect > 0 && c && [c.x,c.y,c.width,c.height].every(Number.isFinite) && c.x >= 0 && c.y >= 0 && c.width > .05 && c.height > .05 && c.x + c.width <= 1.001 && c.y + c.height <= 1.001) visuals.push(item);
    } } catch { /* Preserve surrounding notes when a figure descriptor is invalid. */ }
    return "";
  }).trim();
  return { text, visuals };
}
