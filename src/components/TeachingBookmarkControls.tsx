import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { createTeachingBookmark, resolveTeachingBookmark, type BookmarkPage, type TeachingBookmark } from '@/lib/teaching-bookmark';

type Props = { pages: BookmarkPage[]; index: number; view: TeachingBookmark['view']; bookmark: TeachingBookmark | null; status: string; resumeRequested: boolean; onSave: (value: TeachingBookmark) => void; onResume: () => void; onClear: () => void; onGoTo: (index: number) => void; onResumeDone: () => void };
export function TeachingBookmarkControls({ pages, index, view, bookmark, status, resumeRequested, onSave, onResume, onClear, onGoTo, onResumeDone }: Props) {
  const [notice, setNotice] = useState('');
  // Wait for guided-note pagination before resolving the saved title/section.
  useEffect(() => {
    if (!resumeRequested || !bookmark || bookmark.view !== view || !pages.length) return;
    const target = resolveTeachingBookmark(pages, bookmark);
    if (target) { onGoTo(target.index); setNotice(target.adjusted ? 'The layout changed. Resumed at the matching topic.' : 'Resumed from your teaching bookmark.'); }
    else setNotice('This bookmarked topic is no longer in the lesson. Choose a new bookmark.');
    onResumeDone();
  }, [resumeRequested, bookmark, view, pages, onGoTo, onResumeDone]);
  return <section className="flex max-h-24 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 overflow-y-auto border-t bg-sky-50 px-3 py-1 text-xs leading-4 print:hidden" aria-label="Teaching bookmark">
    <Button className="h-7 px-2 py-0 text-[11px] shadow-none" size="sm" variant="outline" disabled={!pages.length} onClick={() => { const value = createTeachingBookmark(pages, index, view); if (value) { setNotice(''); onSave(value); } }}>Continue from here next time</Button>
    {bookmark&&<><span className="min-w-0 max-w-full truncate sm:max-w-[24rem]" title={`Saved: ${bookmark.title} · slide ${bookmark.index + 1} · ${bookmark.view === 'notes' ? 'Guided notes' : 'PPT slides'}`}>Saved: {bookmark.title} · slide {bookmark.index + 1} · {bookmark.view === 'notes' ? 'Guided notes' : 'PPT slides'}</span><Button className="h-7 px-2 py-0 text-[11px] shadow-none" size="sm" variant="outline" onClick={onResume}>Resume teaching</Button><Button className="h-7 px-2 py-0 text-[11px]" size="sm" variant="ghost" onClick={()=>{setNotice('');onClear();}}>Remove bookmark</Button></>}
    {(notice||status)&&<span role="status" className="text-[11px] leading-4">{notice||status}</span>}
  </section>;
}
