import type { Slide } from "./generate.functions";
export type LayoutPage = Slide & { sourceIndex: number };
export type PageSpace = { page: number; fill: number; overflow: boolean; exempt: boolean };
export const SPARSE_FILL = 0.35;
/** Distinguish sparse pagination from a topic with very little explanation.
 * This is a completeness hint, not a factual judgement or permission to pad. */
export function briefTopicPages(pages:LayoutPage[]):Array<{page:number;title:string}>{
 const seen=new Set<number>(),result:Array<{page:number;title:string}>=[];
 pages.forEach((page,index)=>{
  if(seen.has(page.sourceIndex)||protectedPage(page))return;
  seen.add(page.sourceIndex);
  const lines=[...new Set(pages.filter(item=>item.sourceIndex===page.sourceIndex).flatMap(item=>(item.sections||[]).filter(section=>section.kind!=='diagram'&&!/^Source (?:review|table)|practice|activity|revision|MLT|formula reference/i.test(section.heading)).flatMap(section=>section.lines)))];
  const text=lines.join(' ');
  if(lines.length<3&&text.length<260&&!/[=∝]|\\(?:frac|propto)\b/.test(text))result.push({page:index+1,title:page.title});
 });
 return result;
}
export function layoutKey(pages: LayoutPage[]): string {
  return JSON.stringify(
    pages.map((page) => [page.sourceIndex, page.title, page.kind, page.teacher_pdf, page.sections]),
  );
}
const identity = (page: LayoutPage) => {
  const { sections: _sections, ...rest } = page;
  return JSON.stringify(rest);
};
const protectedPage = (page: LayoutPage) =>
  !!page.teacher_pdf ||
  page.kind === "mcq" ||
  page.kind === "break" ||
  page.visual === "cover" ||
  !(page.sections || []).some((section) => section.lines.length);
export function materializeLayout(pages: LayoutPage[], groups: number[][]): LayoutPage[] {
  const indexes = groups.flat();
  if (
    indexes.length !== pages.length ||
    indexes.some((value, index) => value !== index) ||
    groups.some((group) => !group.length)
  )
    throw new Error("Layout must preserve every page in source order.");
  for (const group of groups)
    if (
      group.length > 1 &&
      group.some(
        (index) =>
          protectedPage(pages[index]) ||
          pages[index].sourceIndex !== pages[group[0]].sourceIndex ||
          pages[index].title !== pages[group[0]].title ||
          identity(pages[index]) !== identity(pages[group[0]]),
      )
    )
      throw new Error("Only continuation pages of the same topic may be combined.");
  return groups.map((group) => {
    const first = pages[group[0]];
    if (group.length === 1) return first;
    const sections: NonNullable<Slide["sections"]> = [];
    for (const index of group)
      for (const section of pages[index].sections || []) {
        const previous = sections.at(-1);
        if (previous?.heading === section.heading && previous.kind === section.kind)
          previous.lines.push(...section.lines);
        else sections.push({ ...section, lines: [...section.lines] });
      }
    return { ...first, sections };
  });
}
export function sameLayoutContent(before: LayoutPage[], after: LayoutPage[]): boolean {
  const content = (pages: LayoutPage[]) =>
    JSON.stringify(
      pages.flatMap((page) =>
        (page.sections || []).flatMap((section) =>
          section.lines.map((line) => [
            page.sourceIndex,
            page.title,
            section.heading,
            section.kind,
            line,
          ]),
        ),
      ),
    );
  const special = (pages: LayoutPage[]) => JSON.stringify(pages.filter(protectedPage));
  const identities = (pages: LayoutPage[]) =>
    pages.map(identity).filter((value, index, all) => index === 0 || value !== all[index - 1]);
  return (
    content(before) === content(after) &&
    special(before) === special(after) &&
    JSON.stringify(identities(before)) === JSON.stringify(identities(after))
  );
}
/** Conservative adjacent merges only; independent DOM measurement verifies the result. */
export function compactLayoutGroups(pages: LayoutPage[], measured: PageSpace[]): number[][] {
  const groups: number[][] = [];
  let fill = 0;
  for (let index = 0; index < pages.length; index++) {
    const page = pages[index],
      measurement = measured[index],
      previous = groups.at(-1),
      prior = previous ? pages[previous[0]] : undefined;
    const safe =
      !protectedPage(page) && !!measurement && !measurement.exempt && !measurement.overflow;
    const priorSafe =
      !!previous &&
      previous.every(
        (i) =>
          !protectedPage(pages[i]) && !!measured[i] && !measured[i].exempt && !measured[i].overflow,
      );
    if (
      safe &&
      priorSafe &&
      prior?.sourceIndex === page.sourceIndex &&
      prior.title === page.title &&
      identity(prior) === identity(page) &&
      fill + measurement.fill + 0.06 <= 0.88 &&
      (fill < SPARSE_FILL || measurement.fill < SPARSE_FILL)
    ) {
      previous!.push(index);
      fill += measurement.fill + 0.06;
    } else {
      groups.push([index]);
      fill = measurement?.fill ?? 1;
    }
  }
  return groups;
}
export function slideSpace(element: HTMLElement, page: LayoutPage, index: number): PageSpace {
  const content = element.querySelector<HTMLElement>("[data-note-content]");
  const exempt =
    !!page.teacher_pdf ||
    page.kind === "mcq" ||
    page.kind === "break" ||
    page.visual === "cover" ||
    !content;
  if (exempt) return { page: index, fill: 1, overflow: false, exempt: true };
  const host = content!.closest("[data-note-sheet]")?.parentElement;
  const box = content!.closest<HTMLElement>("[data-note-sheet]");
  if (!host || !box || host.clientHeight <= 0 || box.clientWidth <= 0)
    throw new Error("The slide could not be measured. Please run the check again.");
  const style = getComputedStyle(box),
    hostStyle = getComputedStyle(host);
  const occupied = Array.from(host.children)
    .filter((child) => child !== box)
    .reduce((sum, child) => sum + (child as HTMLElement).offsetHeight, 0);
  const number = (value: string) => parseFloat(value) || 0;
  const available =
    host.clientHeight -
    occupied -
    number(hostStyle.rowGap) * Math.max(0, host.children.length - 1) -
    number(style.paddingTop) -
    number(style.paddingBottom) -
    number(style.borderTopWidth) -
    number(style.borderBottomWidth) -
    number(style.marginTop) -
    number(style.marginBottom);
  const width = box.clientWidth - number(style.paddingLeft) - number(style.paddingRight);
  const height = content!.scrollHeight;
  if (available <= 0)
    throw new Error("The slide has no measurable notes area. Please run the check again.");
  return {
    page: index,
    fill: height / available,
    overflow: height > available + 3 || content!.scrollWidth > width + 3,
    exempt: false,
  };
}
