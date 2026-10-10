import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { paginateGuidedArticles } from "@/lib/guided-slides";
import { GuidedLessonNotes } from "@/components/GuidedLessonNotes";
import type { Slide } from "@/lib/generate.functions";

export function GuidedNotesPresentation({ slides, title, klass, subject, onClose, onPdf, inline = false, mode = "notes" }: { slides: Slide[]; title: string; klass: string; subject?: string; onClose: () => void; onPdf: () => void; inline?: boolean; mode?: "notes" | "slides" }) {
  const source = useRef<HTMLDivElement>(null), display = useRef<HTMLDivElement>(null), frame = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<HTMLElement[]>([]), [index, setIndex] = useState(0);
  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => { if (!source.current || !frame.current || cancelled) return;
      if (!frame.current.clientWidth || !frame.current.clientHeight) return;
      source.current.style.width = `${frame.current.clientWidth}px`;
      const next = paginateGuidedArticles(source.current, frame.current.clientHeight);
      setPages(next); setIndex((i) => Math.min(i, Math.max(0, next.length - 1)));
    };
    Promise.all([document.fonts.ready, ...Array.from(source.current?.querySelectorAll("img") || []).map((img) => img.decode().catch(() => {}))]).then(measure);
    const observer = new ResizeObserver(measure); if (frame.current) observer.observe(frame.current);
    return () => { cancelled = true; observer.disconnect(); };
  }, [slides, title, klass, subject, mode]);
  useLayoutEffect(() => { if (display.current && pages[index]) { display.current.replaceChildren(pages[index].cloneNode(true)); display.current.scrollTop = 0; } }, [index, pages]);
  useEffect(() => {
    if (inline) return;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" || event.key === " ") { event.preventDefault(); setIndex((i) => Math.max(0, Math.min(pages.length - 1, i + 1))); }
      if (event.key === "ArrowLeft") { event.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose, pages.length, inline]);
  useEffect(() => {
    if (inline) return;
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  }, [inline]);
  return <div className={`guided-presentation guided-slide-deck ${mode === "slides" ? "lecture-deck" : ""} ${inline ? "relative w-full h-[min(80dvh,800px)] min-h-[360px]" : "fixed inset-0 z-50"} flex flex-col bg-slate-100`} role={inline ? "region" : "dialog"} aria-modal={inline ? undefined : true} aria-label="Lesson presentation">
    <div className="shrink-0 flex items-center justify-between gap-3 bg-slate-900 text-white px-5 py-3 text-sm"><strong>{mode === "notes" ? "Guided notes" : "Lecture"} · slide {index + 1} / {pages.length || "…"}</strong><div className="flex gap-4"><button onClick={onPdf}>Download {mode === "notes" ? "notes" : "slides"} PDF</button>{!inline && <button onClick={onClose}>Exit ✕</button>}</div></div>
    <div className="guided-slide-frame" ref={frame}><div ref={display} className="guided-notes guided-slide-display" aria-live="polite" /></div>
    <div className="shrink-0 flex justify-between items-center bg-slate-900 text-white px-5 py-3"><button disabled={!index} onClick={() => setIndex(index - 1)}>← Previous</button><span>{index + 1} / {pages.length || "…"}</span><button disabled={index >= pages.length - 1} onClick={() => setIndex(index + 1)}>Next →</button></div>
    <div ref={source} className="guided-slide-source" aria-hidden="true"><GuidedLessonNotes slides={slides} title={title} klass={klass} subject={subject} includeBreaks={mode === "slides"} /></div>
  </div>;
}
