import { useEffect, useRef, useState, type SetStateAction } from 'react';
import type { Slide } from '@/lib/generate.functions';
import { blankPosition, captureBlankSlides, emptyBlankRecord, readBlankSlides, restoreBlankSlides, type SavedBlankPosition } from '@/lib/saved-blank-slides';

export function useSavedBlankSlides(base: Slide[], key: string) {
  const initial = useRef<ReturnType<typeof emptyBlankRecord> | null>(null);
  const readFailed = useRef(false);
  if (!initial.current) { try { initial.current = readBlankSlides(key); } catch { initial.current = emptyBlankRecord(); readFailed.current = true; } }
  const [slides, update] = useState(() => restoreBlankSlides(base, initial.current!));
  const [deleted, setDeleted] = useState<SavedBlankPosition | null>(initial.current.deleted);
  const [status, setStatus] = useState(readFailed.current ? 'Saving failed — browser storage could not be read.' : 'Saved on this device');
  const [retry, setRetry] = useState(0);
  const dirty = useRef(false), current = useRef(slides); current.current = slides;
  const baseRef = useRef(base);
  // A regenerated lesson keeps only the saved additions; original notes come from the new result.
  useEffect(() => {
    if (baseRef.current === base) return;
    baseRef.current = base;
    update(restoreBlankSlides(base, captureBlankSlides(current.current, deleted)));
  }, [base, deleted]);
  useEffect(() => {
    if (readFailed.current && !dirty.current) return;
    if (!dirty.current && !slides.some(s => s.teacher_blank) && !deleted) return;
    try {
      const value = JSON.stringify(captureBlankSlides(slides, deleted));
      localStorage.setItem(key, value);
      if (localStorage.getItem(key) !== value) throw new Error('Save not confirmed');
      readFailed.current = false;
      setStatus('Saved on this device');
    } catch { setStatus('Saving failed — browser storage may be blocked or full. Keep this lesson open.'); }
  }, [slides, deleted, key, retry]);
  function setSlides(action: SetStateAction<Slide[]>) { dirty.current = true; setStatus('Saving…'); update(action); }
  function remove(id: string) {
    const index = current.current.findIndex(s => s.teacher_blank?.id === id);
    if (index < 0) return;
    setDeleted(blankPosition(current.current, index));
    setSlides(items => items.filter(s => s.teacher_blank?.id !== id));
  }
  function undo() {
    if (!deleted) return;
    setSlides(items => restoreBlankSlides(items, { version: 1, blanks: [deleted], deleted: null }));
    setDeleted(null);
  }
  return { slides, setSlides, remove, undo, deleted, status, retrySave: () => { dirty.current = true; setStatus('Saving…'); setRetry(n => n + 1); } };
}
