export const PRESENTATION_WIDTH = 1280;
export const PRESENTATION_HEIGHT = 720;

/** Paginate the rendered notes, retaining text, list numbering and mathematical nodes. */
export function paginateGuidedArticles(root: HTMLElement, maxHeight: number): HTMLElement[] {
  maxHeight = Math.max(1, maxHeight);
  const pages: HTMLElement[] = [];
  const articles = Array.from(root.querySelectorAll<HTMLElement>(":scope > .guided-notes > .guided-topic"));
  const measure = document.createElement("div"); measure.className = "guided-notes guided-slide-measure"; root.appendChild(measure);
  for (const article of articles) {
    if (article.classList.contains("guided-cover")) {
      const page = article.cloneNode(true) as HTMLElement;
      page.classList.add("guided-slide-page");
      Object.assign(page.style, {height: `${maxHeight}px`, padding: "0", margin: "0", overflow: "hidden", boxSizing: "border-box"});
      measure.appendChild(page); pages.push(page); continue;
    }
    const title = article.querySelector("h2"); let page: HTMLElement; let count = 0;
    const newPage = () => {
      page = article.cloneNode(false) as HTMLElement; page.classList.add("guided-slide-page");
      if (title) { const heading = title.cloneNode(true) as HTMLElement;
        page.appendChild(heading);
      }
      measure.appendChild(page); pages.push(page); count = 0;
    };
    newPage();
    const add = (block: HTMLElement, allowSplit = true) => {
      const shownHeadings = new Set(Array.from(page.querySelectorAll("h3, summary")).map((heading) => heading.textContent));
      const repeated = Array.from(block.querySelectorAll("h3, summary")).filter((heading) => shownHeadings.has(heading.textContent))
        .map((heading) => ({ heading, parent: heading.parentNode!, next: heading.nextSibling }));
      repeated.forEach(({ heading }) => heading.remove());
      page.appendChild(block);
      if (page.scrollHeight > maxHeight && count) {
        block.remove(); repeated.forEach(({ heading, parent, next }) => parent.insertBefore(heading, next));
        newPage(); page.appendChild(block);
      }
      if (page.scrollHeight > maxHeight && allowSplit) {
        const parts = splitOversizedText(block);
        if (parts.length > 1) { block.remove(); parts.forEach((part) => add(part, false)); return; }
      }
      count++;
    };
    const walk = (node: HTMLElement, wrappers: HTMLElement[] = []) => {
      if (node === title || node.tagName === "FOOTER" || node.classList.contains("guided-student-line")) return;
      const wrap = (inner: HTMLElement) => { let block = inner;
        for (const parent of [...wrappers].reverse()) { const outer = parent.cloneNode(false) as HTMLElement;
          Array.from(parent.children).forEach((heading) => outer.appendChild(heading.cloneNode(true))); outer.appendChild(block); block = outer;
        } return block;
      };
      if (node.matches("section, .guided-explanation, .guided-learning-tasks, details") && !node.classList.contains("mathematics-source-review")) {
        const heading = node.querySelector(":scope > h3, :scope > summary");
        for (const child of Array.from(node.children) as HTMLElement[]) {
          if (child === heading) continue;
          const shell = node.cloneNode(false) as HTMLElement; if (shell.tagName === "DETAILS") (shell as HTMLDetailsElement).open = true;
          if (heading) shell.appendChild(heading.cloneNode(true)); walk(child, [...wrappers, shell]);
        }
      } else if (node.classList.contains("dimension-cards")) {
        // Each quantity/formula/memory card can move to the next page independently.
        Array.from(node.children).forEach(child => add(wrap(child.cloneNode(true) as HTMLElement)));
      } else if (node.matches("ul, ol")) {
        Array.from(node.children).forEach((child, index) => { const list = node.cloneNode(false) as HTMLElement;
          if (list.tagName === "OL") list.setAttribute("start", String(index + 1)); list.appendChild(child.cloneNode(true)); add(wrap(list));
        });
      } else if (node.classList.contains("guided-table-scroll")) {
        const table = node.querySelector("table");
        for (const row of Array.from(node.querySelectorAll("tbody tr"))) {
          const shell = node.cloneNode(false) as HTMLElement, copy = table!.cloneNode(false) as HTMLElement;
          const head = table!.querySelector("thead"); if (head) copy.appendChild(head.cloneNode(true));
          const body = document.createElement("tbody"); body.appendChild(row.cloneNode(true)); copy.appendChild(body); shell.appendChild(copy); add(wrap(shell));
        }
      } else add(wrap(node.cloneNode(true) as HTMLElement));
    };
    for (const child of Array.from(article.children) as HTMLElement[]) walk(child);
  }
  // Atomic diagrams or a single unusually wide equation cannot be cut safely.
  // Fit that page as a whole only after ordinary text has been paginated.
  const width = root.clientWidth || root.getBoundingClientRect().width || 1100;
  pages.forEach((page) => {
    const factor = slideFitScale(width, maxHeight, Math.max(width, page.scrollWidth), page.scrollHeight);
    page.style.transformOrigin = "top left";
    page.style.transform = `scale(${factor})`;
    page.dataset.fitScale = String(factor);
    page.remove();
  }); measure.remove(); return pages;
}

export function slideFitScale(width: number, height: number, contentWidth: number, contentHeight: number) {
  return Math.min(1, width / Math.max(1, contentWidth), height / Math.max(1, contentHeight));
}

/** Split long prose without splitting a rendered LaTeX expression or losing markup. */
export function splitOversizedText(block: HTMLElement): HTMLElement[] {
  const targets = block.matches("p, li") ? [block] : Array.from(block.querySelectorAll<HTMLElement>("p, li"));
  if (targets.length !== 1 || block.querySelector("figure, table")) return [block];
  const target = targets[0];
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  const points: Array<{ node: Node; offset: number }> = [];
  let node: Node | null, words = 0;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest(".katex")) continue;
    for (const match of (node.textContent || "").matchAll(/\S+\s*/g)) {
      if (++words % 55 === 0) points.push({ node, offset: match.index! + match[0].length });
    }
  }
  if (words <= 75 || !points.length) return [block];
  const path: number[] = []; let ancestor: Node = target;
  while (ancestor !== block) { path.unshift(Array.from(ancestor.parentNode!.childNodes).indexOf(ancestor as ChildNode)); ancestor = ancestor.parentNode!; }
  const fragments: HTMLElement[] = [];
  let start: { node: Node; offset: number } = { node: target, offset: 0 };
  for (const end of [...points, { node: target, offset: target.childNodes.length }]) {
    const range = document.createRange(); range.setStart(start.node, start.offset); range.setEnd(end.node, end.offset);
    const contents = range.cloneContents();
    if (contents.textContent?.trim()) {
      const copy = block.cloneNode(true) as HTMLElement;
      let destination: Node = copy; path.forEach((index) => { destination = destination.childNodes[index]; });
      (destination as HTMLElement).replaceChildren(contents); fragments.push(copy);
    }
    start = end;
  }
  return fragments;
}
