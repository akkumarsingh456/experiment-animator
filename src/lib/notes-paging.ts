/**
 * Teacher-notes paging helpers.
 *
 * Splits the unified Teacher Notes sections into "blocks" that must never be
 * broken across pages. A formula and its full derivation (the
 * `**Derivation of ...**` line plus every `**Derivation step n:**` line) stay
 * in one block so they always land on the same page.
 *
 * This only affects presentation/layout — the locked notes generation
 * pipeline is untouched.
 */

export type NoteSectionLike = { heading: string; kind: string; lines: string[] };

/** One unbreakable unit of notes: a heading fragment with some of its lines. */
export type NoteBlock = {
  /** Index of the parent section, used to know when a heading repeats. */
  sectionIndex: number;
  heading: string;
  kind: string;
  lines: string[];
};

const DERIV_START = /^\s*\*{0,2}\s*derivation of\b/i;
const DERIV_STEP = /^\s*\*{0,2}\s*derivation step\b/i;
const FORMULA_LABEL = /^\s*\*{0,2}\s*(formula|equation|relation|result)\b/i;

/**
 * Convert sections into unbreakable blocks.
 * - `diagram` sections stay whole (ASCII art must not be split).
 * - A derivation group (optionally preceded by its formula line) is one block.
 * - Everything else becomes a single-line block.
 */
export function toNoteBlocks(sections: NoteSectionLike[] | undefined): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  (sections || []).forEach((sec, sectionIndex) => {
    const lines = sec.lines || [];
    if (sec.kind === "diagram") {
      if (lines.length) {
        blocks.push({ sectionIndex, heading: sec.heading, kind: sec.kind, lines });
      }
      return;
    }
    let i = 0;
    while (i < lines.length) {
      const line = lines[i]!;
      // A formula line directly followed by its derivation → keep together.
      const nextIsDeriv = i + 1 < lines.length && DERIV_START.test(lines[i + 1]!);
      if (DERIV_START.test(line) || (nextIsDeriv && FORMULA_LABEL.test(line))) {
        const group: string[] = [line];
        let j = i + 1;
        if (!DERIV_START.test(line) && j < lines.length && DERIV_START.test(lines[j]!)) {
          group.push(lines[j]!);
          j += 1;
        }
        while (j < lines.length && DERIV_STEP.test(lines[j]!)) {
          group.push(lines[j]!);
          j += 1;
        }
        blocks.push({ sectionIndex, heading: sec.heading, kind: sec.kind, lines: group });
        i = j;
        continue;
      }
      blocks.push({ sectionIndex, heading: sec.heading, kind: sec.kind, lines: [line] });
      i += 1;
    }
  });
  return blocks;
}

/**
 * Greedily pack blocks into pages using measured pixel heights.
 * A block taller than the page gets its own page (it is never dropped).
 */
export function packBlocks(heights: number[], available: number): number[][] {
  const pages: number[][] = [];
  let current: number[] = [];
  let used = 0;
  const limit = Math.max(120, available);
  heights.forEach((h, i) => {
    const height = h || 0;
    if (current.length && used + height > limit) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(i);
    used += height;
  });
  if (current.length) pages.push(current);
  return pages.length ? pages : [[]];
}
