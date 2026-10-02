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
 * Split a note section into A4-sized pages without separating a formula from
 * its derivation. The returned sections preserve headings and block kinds.
 */
export function paginateNoteSections(
  sections: NoteSectionLike[] | undefined,
  maxRows = 18,
): NoteSectionLike[][] {
  const source = sections || [];
  const blocks = toNoteBlocks(source);
  if (!blocks.length) return [source];

  const pages: NoteBlock[][] = [];
  let page: NoteBlock[] = [];
  let rows = 0;
  for (const block of blocks) {
    const blockRows = block.lines.reduce((sum, line) => {
      const plain = line.replace(/\$\$?/g, "").replace(/\\[a-zA-Z]+/g, "x");
      return sum + Math.max(1, Math.ceil(plain.length / 58));
    }, 0);
    const startsSection = !page.length || page[page.length - 1]!.sectionIndex !== block.sectionIndex;
    const cost = blockRows + (startsSection ? 2 : 0);
    if (page.length && rows + cost > maxRows) {
      pages.push(page);
      page = [];
      rows = 0;
    }
    const newSection = !page.length || page[page.length - 1]!.sectionIndex !== block.sectionIndex;
    page.push(block);
    rows += blockRows + (newSection ? 2 : 0);
  }
  if (page.length) pages.push(page);

  return pages.map((pageBlocks) => {
    const grouped = new Map<number, string[]>();
    for (const block of pageBlocks) {
      const lines = grouped.get(block.sectionIndex) || [];
      lines.push(...block.lines);
      grouped.set(block.sectionIndex, lines);
    }
    return [...grouped.entries()].map(([sectionIndex, lines]) => ({
      ...source[sectionIndex]!,
      lines,
    }));
  });
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

/**
 * Pack rendered note blocks while charging a section heading only when it is
 * actually shown: at the start of a section or when that section continues on
 * a new page. This avoids sparse pages caused by measuring the same heading on
 * every individual note line.
 */
export function packMeasuredBlocks(
  blocks: NoteBlock[],
  plainHeights: number[],
  headedHeights: number[],
  available: number,
): number[][] {
  const pages: number[][] = [];
  let current: number[] = [];
  let used = 0;
  const limit = Math.max(120, available);

  blocks.forEach((block, index) => {
    const previousIndex = current[current.length - 1];
    const startsSection = previousIndex === undefined || blocks[previousIndex]?.sectionIndex !== block.sectionIndex;
    let height = (startsSection ? headedHeights[index] : plainHeights[index]) || 0;

    if (current.length && used + height > limit) {
      pages.push(current);
      current = [];
      used = 0;
      height = headedHeights[index] || plainHeights[index] || 0;
    }

    current.push(index);
    used += height;
  });

  if (current.length) pages.push(current);
  return pages.length ? pages : [[]];
}
