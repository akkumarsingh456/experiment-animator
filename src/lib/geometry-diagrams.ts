import { wrapTextbookDrawing } from "@/lib/current-electricity-diagrams";

/** Illustrations express geometry only; metric lengths are never invented. */
export function geometryDiagram(title: string, subject?: string): { svg: string; caption: string } | null {
  if (!/math/i.test(subject || "")) return null;
  const label = (x: number, y: number, value: string) => `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="26" text-anchor="middle" fill="#174455">${value}</text>`;
  if (/pythagor|right.angled triangle|right triangle/i.test(title)) return {
    svg: wrapTextbookDrawing(`<path d="M150 400V120L610 400Z" fill="#edf7f5" stroke="#174455" stroke-width="4"/><path d="M150 373H177V400" fill="none" stroke="#d77642" stroke-width="3"/>${label(128, 430, "A")}${label(135, 100, "B")}${label(630, 430, "C")}${label(95, 260, "a")}${label(380, 446, "b")}${label(410, 235, "c (hypotenuse)")}`, "right-triangle"),
    caption: "Right angle at A. The hypotenuse is opposite the right angle; a and b label the other two sides. Schematic, not to scale.",
  };
  if (/tangent/i.test(title) && /circle/i.test(title)) return {
    svg: wrapTextbookDrawing(`<circle cx="330" cy="260" r="145" fill="#edf7f5" stroke="#174455" stroke-width="4"/><path d="M475 55V470M330 260H475" fill="none" stroke="#174455" stroke-width="4"/><path d="M451 260V236H475" fill="none" stroke="#d77642" stroke-width="3"/><circle cx="330" cy="260" r="5" fill="#174455"/>${label(310, 291, "O")}${label(506, 274, "T")}${label(395, 242, "radius")}${label(535, 100, "tangent")}`, "circle-tangent"),
    caption: "OT is the radius to the point of contact T. The tangent at T is perpendicular to OT. Schematic, not to scale.",
  };
  return null;
}
