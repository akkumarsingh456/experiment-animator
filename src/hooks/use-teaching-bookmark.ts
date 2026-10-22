import { useState } from 'react';
import { teachingBookmarkSchema, type TeachingBookmark } from '@/lib/teaching-bookmark';

/** Personal browser bookmark only; never write progress into shared lesson data. */
export function useTeachingBookmark(lessonKey: string) {
  const key = 'eduplan-teaching-bookmark-v1:' + lessonKey;
  const [initial] = useState(() => {
    try { const raw = localStorage.getItem(key); return { bookmark: raw ? teachingBookmarkSchema.parse(JSON.parse(raw)) : null, status: raw ? 'Teaching bookmark saved on this device.' : '' }; }
    catch { return { bookmark: null, status: 'Bookmark could not be read on this device.' }; }
  });
  const [bookmark, setBookmark] = useState<TeachingBookmark | null>(initial.bookmark);
  const [status, setStatus] = useState(initial.status);
  function save(value: TeachingBookmark) {
    try {
      const raw = JSON.stringify(teachingBookmarkSchema.parse(value));
      localStorage.setItem(key, raw);
      if (localStorage.getItem(key) !== raw) throw new Error('Save not confirmed');
      setBookmark(value); setStatus('Teaching bookmark saved on this device.');
    } catch { setStatus('Bookmark saving failed. Browser storage may be blocked or full.'); }
  }
  function clear() {
    try { localStorage.removeItem(key); if (localStorage.getItem(key) !== null) throw new Error('Removal not confirmed'); setBookmark(null); setStatus('Teaching bookmark removed.'); }
    catch { setStatus('Bookmark could not be removed. Please retry.'); }
  }
  return { bookmark, status, save, clear };
}
