import { z } from 'zod';
export type BookmarkPage = { title: string; section: string };
export const teachingBookmarkSchema = z.object({ version: z.literal(1), view: z.enum(['notes', 'slides']), title: z.string().min(1).max(1000), section: z.string().max(1000), occurrence: z.number().int().min(0), index: z.number().int().min(0), savedAt: z.string() });
export type TeachingBookmark = z.infer<typeof teachingBookmarkSchema>;
export function createTeachingBookmark(pages: BookmarkPage[], index: number, view: TeachingBookmark['view']): TeachingBookmark | null {
  const page = pages[index];
  if (!page?.title) return null;
  return { version: 1, view, ...page, index, occurrence: pages.slice(0, index).filter(item => item.title === page.title && item.section === page.section).length, savedAt: new Date().toISOString() };
}
/** Never jump to the old numeric position when a saved topic has disappeared. */
export function resolveTeachingBookmark(pages: BookmarkPage[], bookmark: TeachingBookmark): { index: number; adjusted: boolean } | null {
  const exact = pages.flatMap((page, index) => page.title === bookmark.title && page.section === bookmark.section ? [index] : []);
  if (exact.length) return { index: exact[Math.min(bookmark.occurrence, exact.length - 1)], adjusted: bookmark.occurrence >= exact.length };
  const index = pages.findIndex(page => page.title === bookmark.title);
  return index >= 0 ? { index, adjusted: true } : null;
}
