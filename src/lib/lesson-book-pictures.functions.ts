import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type { GenerationResult, Slide } from '@/lib/generate.functions';

/** Return original, verified book captures without regenerating any lesson text. */
export const loadLessonBookPictures = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown) => z.object({
    klass: z.string().max(30), subject: z.string().max(100), chapter: z.string().max(300),
    slides: z.array(z.object({ title: z.string().max(500), kind: z.enum(['content', 'break', 'mcq', 'chapter']).optional(), topic_text: z.string().max(30000).optional() })).max(2000),
  }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { appendUploadedReferenceNotes } = await import('@/lib/uploaded-reference-notes');
    const skeleton: GenerationResult = { slides: data.slides.map(slide => ({ title: slide.title, kind: slide.kind, sections: [], bullets: [], notes: [slide.topic_text || ''], key_terms: [], visual: 'book' })), source_books: [], context_chars: 0, activities: [], activity_matches: [], video: { title: '', scenes: [] } };
    const enriched = await appendUploadedReferenceNotes(skeleton, supabaseAdmin, data.klass, data.subject, data.chapter);
    return enriched.slides.map(slide => ({ title: slide.title, visuals: (slide.reference_visuals || []).filter(visual => !!visual.url) }));
  });
