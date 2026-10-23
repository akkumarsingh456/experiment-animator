import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, LayoutList, Maximize2, X } from "lucide-react";
import {
  paginateGuidedArticles,
  PRESENTATION_WIDTH,
  PRESENTATION_HEIGHT,
} from "@/lib/guided-slides";
import { GuidedLessonNotes } from "@/components/GuidedLessonNotes";
import type { ReactNode } from "react";
import type { Slide } from "@/lib/generate.functions";
import type { BookmarkPage } from '@/lib/teaching-bookmark';

export type PresentationSlide = { title: string; section?: string; content: ReactNode; sourceIndex?:number; noteHeadings?:string[] };

type Props = {
  presentationSlides?: PresentationSlide[];
  slides: Slide[];
  title: string;
  klass: string;
  subject?: string;
  onClose: () => void;
  onPdf: () => void;
  downloading?: boolean;
  onPresent?: () => void;
  inline?: boolean;
  mode?: "notes" | "slides";
  pageIndex?: number;
  onPageChange?: (index: number) => void;
  renderTopicRecovery?: (topicTitle: string) => ReactNode;
  renderSlideNotesIcon?: (topicTitle:string,sourceIndex?:number,noteHeadings?:string[])=>ReactNode;
  renderBookmarkControls?: (pages: BookmarkPage[], index: number, goTo: (index: number) => void) => ReactNode;
};

export function GuidedNotesPresentation({
  slides,
  presentationSlides,
  title,
  klass,
  subject,
  onClose,
  onPdf,
  downloading = false,
  onPresent,
  inline = false,
  mode = "notes",
  pageIndex,
  onPageChange,
  renderTopicRecovery,
  renderSlideNotesIcon,
  renderBookmarkControls,
}: Props) {
  const source = useRef<HTMLDivElement>(null),
    display = useRef<HTMLDivElement>(null),
    stage = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null),
    activeNavigation = useRef<HTMLButtonElement>(null);
  const [pages, setPages] = useState<HTMLElement[]>([]);
  const [localIndex, setLocalIndex] = useState(0);
  const [showOutline, setShowOutline] = useState(false);
  const [scale, setScale] = useState(0.5);
  const wheelNavigation = useRef({ total: 0, lastEvent: 0, lastTurn: -Infinity });
  const pageCount = presentationSlides?.length ?? pages.length;
  const index = Math.min(pageIndex ?? localIndex, Math.max(0, pageCount - 1));
  const goTo = useCallback(
    (next: number) => {
      const target = Math.max(0, Math.min(pageCount - 1, next));
      setLocalIndex(target);
      onPageChange?.(target);
    },
    [pageCount, onPageChange],
  );

  // Measure at the same widescreen size as PDF and PowerPoint exports.
  // Resizing scales the canvas without changing slide count or position.
  useLayoutEffect(() => {
    if (presentationSlides) return;
    let cancelled = false;
    setPages([]);
    Promise.all([
      document.fonts.ready,
      ...Array.from(source.current?.querySelectorAll("img") || []).map((img) =>
        img.decode().catch(() => {}),
      ),
    ]).then(() => {
      if (cancelled || !source.current) return;
      const next = paginateGuidedArticles(source.current, PRESENTATION_HEIGHT);
      setPages(next);
      setLocalIndex((value) => Math.min(value, Math.max(0, next.length - 1)));
    });
    return () => {
      cancelled = true;
    };
  }, [slides, title, klass, subject, mode, presentationSlides]);

  useLayoutEffect(() => {
    if (!stage.current) return;
    const resize = () => {
      const area = stage.current!;
      setScale(
        Math.max(
          0.01,
          Math.min(
            (area.clientWidth - 32) / PRESENTATION_WIDTH,
            (area.clientHeight - 32) / PRESENTATION_HEIGHT,
          ),
        ),
      );
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (presentationSlides) return;
    if (display.current)
      display.current.replaceChildren(...(pages[index] ? [pages[index].cloneNode(true)] : []));
    activeNavigation.current?.scrollIntoView({ block: "nearest" });
  }, [index, pages, showOutline, presentationSlides]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        inline &&
        (!shell.current?.contains(document.activeElement) ||
          document.querySelector('[role="dialog"][aria-label="Lesson presentation"]'))
      )
        return;
      const nestedDialog=(event.target as HTMLElement)?.closest('[role="dialog"]');
      if(nestedDialog&&nestedDialog!==shell.current)return;
      if ((event.target as HTMLElement)?.closest("input, textarea, select, [contenteditable=true]"))
        return;
      if (event.key === "Escape" && !inline) onClose();
      if (
        ["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key) ||
        (event.key === " " && (event.target === shell.current || event.target === document.body))
      ) {
        event.preventDefault();
        goTo(
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? pageCount - 1
              : index + (event.key === "ArrowLeft" ? -1 : 1),
        );
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [inline, index, pageCount, onClose, goTo]);

  useEffect(() => {
    const area = stage.current;
    if (!area) return;
    const wheel = (event: WheelEvent) => {
      if (pageCount < 2 || event.defaultPrevented || event.ctrlKey || event.metaKey ||
        event.shiftKey || !event.deltaY || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      if (inline && document.querySelector('[role="dialog"][aria-label="Lesson presentation"]')) return;
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest('input, textarea, select, button, a, [contenteditable], [role="dialog"], [role="slider"], [role="listbox"], iframe');
      if (control && area.contains(control)) return;
      // Keep scrolling available to editors and other nested scroll regions.
      for (let node = target; node && node !== area; node = node.parentElement) {
        if (node instanceof HTMLElement && node.scrollHeight > node.clientHeight + 1 &&
          /auto|scroll/.test(getComputedStyle(node).overflowY)) return;
      }
      event.preventDefault();
      const now = performance.now(), state = wheelNavigation.current;
      if (now - state.lastEvent > 180 || Math.sign(event.deltaY) !== Math.sign(state.total)) state.total = 0;
      state.lastEvent = now;
      if (now - state.lastTurn < 450) { state.total = 0; return; }
      state.total += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? area.clientHeight : 1);
      if (Math.abs(state.total) < 40) return;
      const direction = Math.sign(state.total);
      state.total = 0;
      state.lastTurn = now;
      goTo(index + direction);
    };
    area.addEventListener('wheel', wheel, { passive: false });
    return () => area.removeEventListener('wheel', wheel);
  }, [inline, index, pageCount, goTo]);

  useEffect(() => {
    if (inline) return;
    const previous = document.body.style.overflow,
      previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    shell.current?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const nestedDialog=(event.target as HTMLElement)?.closest('[role="dialog"]');
      if(nestedDialog&&nestedDialog!==shell.current)return;
      const buttons = Array.from(
        shell.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href], [tabindex='0']",
        ) || [],
      ).filter((node) => !node.closest('[aria-hidden="true"]'));
      const first = buttons[0],
        last = buttons[buttons.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === shell.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === shell.current)
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", trapFocus);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", trapFocus);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      previousFocus?.focus();
    };
  }, [inline]);

  const pageTitle = (at: number) =>
    presentationSlides?.[at]?.title || pages[at]?.querySelector("h2")?.textContent || title;
  const pageSection = (at: number) =>
    presentationSlides?.[at]?.section ||
    pages[at]?.querySelector("h3, .guided-figure-heading strong, summary")?.textContent;
  const sectionTitle = pageSection(index);
  return (
    <div
      ref={shell}
      tabIndex={0}
      className={`guided-presentation guided-slide-deck ${presentationSlides ? "original-slide-deck" : mode === "slides" ? "lecture-deck" : ""} ${inline ? "presentation-inline" : "presentation-overlay"}`}
      role={inline ? "region" : "dialog"}
      aria-modal={inline ? undefined : true}
      aria-label="Lesson presentation"
    >
      <header className="presentation-toolbar">
        <div className="presentation-heading">
          <span className="presentation-eyebrow">
            {[
              klass && `Class ${klass}`,
              subject,
              presentationSlides ? "Generate PPT & Notes" : "Guided notes presentation",
            ]
              .filter(Boolean)
              .join(" / ")}
          </span>
          <strong title={title}>{title}</strong>
        </div>
        <div className="presentation-actions">
          <button
            className="presentation-icon-button"
            onClick={() => setShowOutline((value) => !value)}
            aria-label="Toggle slide navigator"
            aria-expanded={showOutline}
          >
            <LayoutList size={18} />
          </button>
          <button
            className="presentation-icon-button"
            onClick={onPdf}
            disabled={downloading}
            aria-busy={downloading}
            aria-label={mode === "notes" ? "Download guided presentation PDF" : "Download Lovable slides PDF"}
            title={downloading ? "Preparing download..." : mode === "notes" ? "Download guided presentation PDF" : "Download Lovable slides PDF"}
          >
            {downloading ? <span role="status">Preparing PDF...</span> : <Download size={18} />}
          </button>
          {inline && onPresent && (
            <button className="presentation-present-button" onClick={onPresent}>
              <Maximize2 size={16} />
              <span>Present</span>
            </button>
          )}
          {!inline && (
            <button
              className="presentation-icon-button"
              onClick={onClose}
              aria-label="Exit presentation"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </header>
      <div className="presentation-workspace">
        {showOutline && (
          <nav className="presentation-outline" aria-label="Slide navigator">
            <div className="presentation-outline-heading">
              Lesson outline <span>{pageCount} slides</span>
            </div>
            {Array.from({ length: pageCount }, (_, at) => (
              <button
                key={at}
                ref={at === index ? activeNavigation : undefined}
                onClick={() => {
                  goTo(at);
                  if (window.matchMedia("(max-width: 640px)").matches) setShowOutline(false);
                }}
                aria-current={at === index ? "step" : undefined}
              >
                <span className="presentation-slide-number">{String(at + 1).padStart(2, "0")}</span>
                <span>
                  <strong>{pageTitle(at)}</strong>
                  <small>{pageSection(at) || "Overview"}</small>
                </span>
              </button>
            ))}
          </nav>
        )}
        <div className="presentation-stage" ref={stage}>
          <div
            className="guided-slide-frame"
            style={{ width: PRESENTATION_WIDTH * scale, height: PRESENTATION_HEIGHT * scale }}
          >
            <div
              key={presentationSlides ? "original" : "guided"}
              ref={display}
              className={`guided-notes guided-slide-display ${presentationSlides ? "original-slide-display" : ""}`}
              style={{
                width: PRESENTATION_WIDTH,
                height: PRESENTATION_HEIGHT,
                transform: `scale(${scale})`,
              }}
              aria-live="polite"
              aria-label={
                pageCount ? `Slide ${index + 1}: ${pageTitle(index)}` : "Preparing presentation"
              }
            >
              {presentationSlides?.[index]?.content}
            </div>
            {!pageCount && (
              <div className="presentation-loading" role="status">
                Preparing your slides…
              </div>
            )}
          </div>
        </div>
      </div>
      {renderTopicRecovery?.(pageTitle(index))}
      {renderBookmarkControls?.(Array.from({length:pageCount},(_,at)=>({title:pageTitle(at),section:pageSection(at)||''})),index,goTo)}
      <footer className="presentation-footer">
        <div className="presentation-page-context">
          <strong>{sectionTitle || "Lesson overview"}</strong>
          <span>Use ← → to move between slides</span>
        </div>
        <div className="presentation-navigation">
          {renderSlideNotesIcon?.(pageTitle(index),presentationSlides?.[index]?.sourceIndex,presentationSlides?.[index]?.noteHeadings||Array.from(pages[index]?.querySelectorAll('h3')||[]).map(heading=>heading.textContent||''))}
          <button
            className="presentation-icon-button"
            disabled={!pageCount || !index}
            onClick={() => goTo(index - 1)}
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="presentation-page-count" role="status">
            {pageCount ? index + 1 : "—"}
            <span> / {pageCount || "—"}</span>
          </span>
          <button
            className="presentation-icon-button"
            disabled={!pageCount || index >= pageCount - 1}
            onClick={() => goTo(index + 1)}
            aria-label="Next slide"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div
          className="presentation-progress"
          role="progressbar"
          aria-label="Lesson progress"
          aria-valuemin={0}
          aria-valuemax={pageCount || 1}
          aria-valuenow={pageCount ? index + 1 : 0}
        >
          <span style={{ width: pageCount ? `${((index + 1) / pageCount) * 100}%` : "0%" }} />
        </div>
      </footer>
      {!presentationSlides && (
        <div
          ref={source}
          className="guided-slide-source"
          style={{ width: PRESENTATION_WIDTH }}
          aria-hidden="true"
        >
          <GuidedLessonNotes
            slides={slides}
            title={title}
            klass={klass}
            subject={subject}
            includeCover
            textOnly={mode === "notes"}
            includeBreaks={mode === "slides"}
          />
        </div>
      )}
    </div>
  );
}

