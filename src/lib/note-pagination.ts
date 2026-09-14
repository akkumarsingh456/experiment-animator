/**
 * Note pagination utilities
 * Splits long notes into multiple pages so each fits without scrolling
 */

export interface PaginatedSlide {
  page: number;
  totalPages: number;
  content: SlideContent;
}

export interface SlideContent {
  title: string;
  bullets?: string[];
  notes?: string[];
  key_terms?: Array<{ term: string; meaning: string }>;
  ncert_quote?: string;
  sections?: Array<{ heading: string; kind: string; lines: string[] }>;
  chapter_text?: string;
}

/**
 * Estimates the visual height of content in pixels based on text length and type
 */
function estimateContentHeight(content: SlideContent): number {
  let height = 0;

  // Title: ~40px
  if (content.title) height += 40;

  // Bullets: ~20px each
  if (content.bullets?.length) {
    height += content.bullets.reduce((acc, b) => acc + Math.ceil(b.length / 60) * 20, 0);
  }

  // Sections: ~25px per line
  if (content.sections?.length) {
    for (const sec of content.sections) {
      height += 30; // heading
      height += sec.lines.reduce((acc, l) => acc + Math.ceil(l.length / 70) * 20, 0);
    }
  }

  // Notes: ~18px each
  if (content.notes?.length) {
    height += 25; // "NCERT notes" label
    height += content.notes.reduce((acc, n) => acc + Math.ceil(n.length / 65) * 18, 0);
  }

  // Key terms: ~16px per term
  if (content.key_terms?.length) {
    height += 25; // "Key terms" label
    height += content.key_terms.length * 20;
  }

  // Quote: ~20px
  if (content.ncert_quote) height += 25;

  // Chapter text: ~18px per line (assuming ~65 chars per line)
  if (content.chapter_text) {
    const lines = Math.ceil(content.chapter_text.length / 65);
    height += lines * 18;
  }

  return height;
}

/**
 * Calculates available space in a slide for content (in pixels)
 * Based on A4 landscape (297mm x 210mm) with standard margins
 */
const AVAILABLE_HEIGHT = 480; // pixels (~5.5 inches at screen resolution)

/**
 * Splits a slide's content into paginated pages
 * Returns an array of content splits, each fitting within AVAILABLE_HEIGHT
 */
export function paginateSlideContent(content: SlideContent): SlideContent[] {
  const totalHeight = estimateContentHeight(content);

  // If content fits in one page, return as-is
  if (totalHeight <= AVAILABLE_HEIGHT) {
    return [content];
  }

  const pages: SlideContent[] = [];
  let currentPage: SlideContent = {
    title: content.title, // Title always on first page
  };
  let currentHeight = 40; // account for title

  // Helper: add item to current page or create new page
  const tryAddBullets = (bullets: string[]) => {
    for (const bullet of bullets) {
      const bulletHeight = Math.ceil(bullet.length / 60) * 20;
      if (currentHeight + bulletHeight > AVAILABLE_HEIGHT && currentPage.bullets?.length) {
        // Start new page
        pages.push(currentPage);
        currentPage = { title: `${content.title} (continued)` };
        currentHeight = 40;
      }
      if (!currentPage.bullets) currentPage.bullets = [];
      currentPage.bullets.push(bullet);
      currentHeight += bulletHeight;
    }
  };

  const tryAddNotes = (notes: string[]) => {
    const labelHeight = 25;
    if (currentHeight + labelHeight > AVAILABLE_HEIGHT && currentPage.notes?.length) {
      pages.push(currentPage);
      currentPage = { title: `${content.title} (continued)` };
      currentHeight = 40;
    }

    if (notes.length && !currentPage.notes) {
      currentHeight += labelHeight;
    }

    for (const note of notes) {
      const noteHeight = Math.ceil(note.length / 65) * 18;
      if (currentHeight + noteHeight > AVAILABLE_HEIGHT && currentPage.notes?.length) {
        pages.push(currentPage);
        currentPage = { title: `${content.title} (continued)` };
        currentHeight = 40 + labelHeight;
      }
      if (!currentPage.notes) currentPage.notes = [];
      currentPage.notes.push(note);
      currentHeight += noteHeight;
    }
  };

  const tryAddKeyTerms = (keyTerms: Array<{ term: string; meaning: string }>) => {
    const labelHeight = 25;
    if (currentHeight + labelHeight > AVAILABLE_HEIGHT && currentPage.key_terms?.length) {
      pages.push(currentPage);
      currentPage = { title: `${content.title} (continued)` };
      currentHeight = 40;
    }

    if (keyTerms.length && !currentPage.key_terms) {
      currentHeight += labelHeight;
    }

    for (const term of keyTerms) {
      const termHeight = 20;
      if (currentHeight + termHeight > AVAILABLE_HEIGHT && currentPage.key_terms?.length) {
        pages.push(currentPage);
        currentPage = { title: `${content.title} (continued)` };
        currentHeight = 40 + labelHeight;
      }
      if (!currentPage.key_terms) currentPage.key_terms = [];
      currentPage.key_terms.push(term);
      currentHeight += termHeight;
    }
  };

  // Process content in order
  if (content.bullets?.length) tryAddBullets(content.bullets);
  if (content.sections?.length) {
    for (const section of content.sections) {
      const sectionHeight = 30 + section.lines.reduce((acc, l) => acc + Math.ceil(l.length / 70) * 20, 0);
      if (currentHeight + sectionHeight > AVAILABLE_HEIGHT) {
        pages.push(currentPage);
        currentPage = { title: `${content.title} (continued)` };
        currentHeight = 40;
      }
      if (!currentPage.sections) currentPage.sections = [];
      currentPage.sections.push(section);
      currentHeight += sectionHeight;
    }
  }
  if (content.notes?.length) tryAddNotes(content.notes);
  if (content.key_terms?.length) tryAddKeyTerms(content.key_terms);
  if (content.ncert_quote) {
    if (currentHeight + 25 > AVAILABLE_HEIGHT) {
      pages.push(currentPage);
      currentPage = { title: `${content.title} (continued)` };
      currentHeight = 40;
    }
    currentPage.ncert_quote = content.ncert_quote;
    currentHeight += 25;
  }

  pages.push(currentPage);
  return pages;
}
