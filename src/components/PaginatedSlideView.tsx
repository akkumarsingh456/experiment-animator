/**
 * PaginatedSlideView component
 * Renders paginated slide content without scrolling
 * Shows page indicator and navigation controls
 */

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { paginateSlideContent } from "@/lib/note-pagination";
import type { Slide } from "@/lib/generate.functions";

interface PaginatedSlideViewProps {
  slide: Slide;
  scale?: "card" | "present";
  renderContent: (slide: Slide, scale?: "card" | "present") => React.ReactNode;
}

export function PaginatedSlideView({ slide, scale = "card", renderContent }: PaginatedSlideViewProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Paginate the slide content
  const pages = useMemo(() => {
    const paginatedSlides = paginateSlideContent({
      title: slide.title || "",
      bullets: slide.bullets,
      notes: slide.notes,
      key_terms: slide.key_terms,
      ncert_quote: slide.ncert_quote,
      sections: (slide as any).sections,
      chapter_text: slide.chapter_text,
    });

    // Convert back to Slide objects for rendering
    return paginatedSlides.map((pageContent) => ({
      ...slide,
      ...pageContent,
    }));
  }, [slide]);

  const currentPage = pages[currentPageIndex];
  const totalPages = pages.length;
  const hasMultiplePages = totalPages > 1;

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Main content area - no scroll */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {renderContent(currentPage, scale)}
      </div>

      {/* Page navigation (only shown if multiple pages) */}
      {hasMultiplePages && (
        <div className="flex items-center justify-center gap-2 px-2 py-1 bg-secondary/50 rounded-md">
          <Button
            size="sm"
            variant="ghost"
            disabled={currentPageIndex === 0}
            onClick={() => setCurrentPageIndex((i) => i - 1)}
            className="h-6 w-6 p-0"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <span className="text-xs font-mono text-muted-foreground">
            {currentPageIndex + 1} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={currentPageIndex === totalPages - 1}
            onClick={() => setCurrentPageIndex((i) => i + 1)}
            className="h-6 w-6 p-0"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
