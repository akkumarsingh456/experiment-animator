import { paginateNoteSections, type NoteSectionLike } from "@/lib/notes-paging";

/** Long proofs continue at step boundaries instead of being clipped into one slide. */
export function paginateLectureSections(sections: NoteSectionLike[] | undefined, maxRows = 12): NoteSectionLike[][] {
  const pages = paginateNoteSections(sections, maxRows);
  return pages.flatMap((page) => {
    const result: NoteSectionLike[][] = []; let current: NoteSectionLike[] = [], rows = 0;
    for (const section of page) for (const line of section.lines) {
      const cost = Math.max(1, Math.ceil(line.replace(/\$\$?|\\[a-zA-Z]+/g, "").length / 58));
      const same = current.at(-1)?.heading === section.heading;
      if (rows && rows + cost + (same ? 0 : 2) > maxRows) { result.push(current); current = []; rows = 0; }
      if (current.at(-1)?.heading !== section.heading) { current.push({ ...section, lines: [] }); rows += 2; }
      current.at(-1)!.lines.push(line); rows += cost;
    }
    if (current.length) result.push(current);
    return result.length ? result : [page];
  });
}
