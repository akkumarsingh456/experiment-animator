import { useEffect } from "react";
import { GuidedLessonNotes } from "@/components/GuidedLessonNotes";
import type { Slide } from "@/lib/generate.functions";

export function GuidedNotesPresentation({ slides, title, klass, subject, onClose, onPdf }: { slides: Slide[]; title: string; klass: string; subject?: string; onClose: () => void; onPdf: () => void }) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = previous; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  }, [onClose]);
  return <div className="guided-presentation fixed inset-0 z-50 flex flex-col bg-slate-100" role="dialog" aria-modal="true" aria-label="Guided notes presentation">
    <div className="shrink-0 flex items-center justify-between gap-3 bg-slate-900 text-white px-5 py-3 text-sm"><strong>Guided notes · scroll to present</strong><div className="flex gap-4"><button onClick={onPdf}>Download notes PDF</button><button onClick={onClose}>Exit ✕</button></div></div>
    <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6"><GuidedLessonNotes slides={slides} title={title} klass={klass} subject={subject} /></div>
  </div>;
}
