/** Paginate the rendered notes, retaining text, list numbering and mathematical nodes. */
export function paginateGuidedArticles(root: HTMLElement, maxHeight: number): HTMLElement[] {
  const pages: HTMLElement[] = [];
  const articles = Array.from(root.querySelectorAll<HTMLElement>(":scope > .guided-notes > .guided-topic"));
  const measure = document.createElement("div"); measure.className = "guided-notes guided-slide-measure"; root.appendChild(measure);
  for (const article of articles) {
    const title = article.querySelector("h2"); let page: HTMLElement; let continuation = 0, count = 0;
    const newPage = () => {
      page = article.cloneNode(false) as HTMLElement; page.classList.add("guided-slide-page");
      if (title) { const heading = title.cloneNode(true) as HTMLElement;
        if (continuation++) { const label = document.createElement("span"); label.className = "guided-continuation"; label.textContent = " · continued"; heading.appendChild(label); }
        page.appendChild(heading);
      }
      measure.appendChild(page); pages.push(page); count = 0;
    };
    newPage();
    const add = (block: HTMLElement) => {
      page.appendChild(block);
      if (page.scrollHeight > maxHeight && count) { block.remove(); newPage(); page.appendChild(block); }
      count++;
    };
    const walk = (node: HTMLElement, wrappers: HTMLElement[] = []) => {
      if (node === title || node.tagName === "FOOTER" || node.classList.contains("guided-student-line")) return;
      const wrap = (inner: HTMLElement) => { let block = inner;
        for (const parent of [...wrappers].reverse()) { const outer = parent.cloneNode(false) as HTMLElement;
          Array.from(parent.children).forEach((heading) => outer.appendChild(heading.cloneNode(true))); outer.appendChild(block); block = outer;
        } return block;
      };
      if (node.matches("section, .guided-explanation, .guided-learning-tasks, details")) {
        const heading = node.querySelector(":scope > h3, :scope > summary");
        for (const child of Array.from(node.children) as HTMLElement[]) {
          if (child === heading) continue;
          const shell = node.cloneNode(false) as HTMLElement; if (shell.tagName === "DETAILS") (shell as HTMLDetailsElement).open = true;
          if (heading) shell.appendChild(heading.cloneNode(true)); walk(child, [...wrappers, shell]);
        }
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
  pages.forEach((page) => page.remove()); measure.remove(); return pages;
}
