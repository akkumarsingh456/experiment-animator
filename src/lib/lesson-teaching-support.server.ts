import type { GenerationResult, Slide } from './generate.functions';
import { selectSlideExcerpts } from './ncert-teacher-notes';
import { gatewayJSON, hasGatewayKey } from './structured-response-client';
import { supportedTeachingSections, teachingSupportPrompt, teachingSupportSchema } from './topic-teaching-support';
import { learningProfile } from './learning-design';
import { notesQualityPolicy } from './notes-quality-policy';

type Scope = { klass: string; subject: string; chapter: string };
const eligible = (slide: Slide) => (!slide.kind || slide.kind === 'content' || slide.kind === 'chapter')
  && slide.visual !== 'cover' && !slide.teacher_pdf && !slide.teacher_revision && !slide.teacher_blank;

/** A common, additive exit for fresh, cached and recovered lessons. Never rewrite
 * core notes, completeness/verification status, quizzes or imported images. */
export async function addLessonTeachingSupport(lesson: GenerationResult, scope: Scope): Promise<GenerationResult> {
  if (!hasGatewayKey() && !process.env.GROQ_API_KEY) return lesson;
  try {
    const candidates = await Promise.all(lesson.slides.map(async (slide, index) => {
      if (!eligible(slide) || slide.teaching_support?.length) return null;
      // Recovered source text is valid evidence; model-authored notes/bullets are not.
      let excerpts = selectSlideExcerpts({ title: slide.title, grounding: slide.grounding, chapter_text: slide.chapter_text }, '');
      if (excerpts.join(' ').length < 100) {
        const { readAttentionSources } = await import('./attention-source-read.server');
        const { attentionEvidenceWindows } = await import('./attention-topic-notes.server');
        const sources = await readAttentionSources({ ...scope, topic: slide.title });
        excerpts = sources.flatMap(source => selectSlideExcerpts({ title: slide.title, chapter_text: attentionEvidenceWindows(slide.title, source.text, scope.chapter) }, ''));
      }
      if (excerpts.join(' ').length < 100) return null;
      // Bound request size per topic, retaining whole source sentences.
      const chosen: string[] = []; let length = 0;
      for (const excerpt of excerpts) { if (length + excerpt.length > 10000) continue; chosen.push(excerpt); length += excerpt.length; }
      return chosen.length ? { index, title: slide.title, teaching_excerpts: chosen } : null;
    }));
    const targets = candidates.filter((value): value is NonNullable<typeof value> => value !== null);
    if (!targets.length) return lesson;
    const additions = new Map<number, ReturnType<typeof supportedTeachingSections>>();
    const batches = Array.from({ length: Math.ceil(targets.length / 3) }, (_, index) => targets.slice(index * 3, index * 3 + 3));
    await Promise.all(batches.map(async batch => {
      try {
        const prompt = [teachingSupportPrompt, `Class: ${scope.klass}; Subject: ${scope.subject}; Chapter: ${scope.chapter}.`,
          learningProfile(scope.subject, scope.klass).focus, learningProfile(scope.subject, scope.klass).level,
          ...notesQualityPolicy(scope.subject, scope.chapter),
          'Return JSON {"slides":[{"index":0,"teaching_support":[]}]} only. Generate support only; never rewrite existing notes. Return [] for unsupported categories.', JSON.stringify(batch)].join('\n');
        let result = await gatewayJSON<{ slides?: Array<{ index: number; teaching_support: unknown }> }>({
          prompt, schemaName: 'additive_topic_teaching_support', reasoningEffort: 'high', schema: {
            type: 'object', additionalProperties: false, required: ['slides'], properties: { slides: { type: 'array', items: {
              type: 'object', additionalProperties: false, required: ['index', 'teaching_support'], properties: { index: { type: 'integer' }, teaching_support: teachingSupportSchema },
            } } },
          },
        });
        if (!result && process.env.GROQ_API_KEY) {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST', signal: AbortSignal.timeout(90000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
            body: JSON.stringify({ model: 'openai/gpt-oss-120b', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
          });
          if (response.ok) { const body = await response.json(); result = JSON.parse(body?.choices?.[0]?.message?.content || 'null'); }
        }
        if (!Array.isArray(result?.slides)) return;
        for (const output of result.slides) {
          const target = batch.find(row => row.index === output.index);
          if (!target || additions.has(target.index)) continue;
          const support = supportedTeachingSections(output.teaching_support, target.teaching_excerpts);
          if (support.length) additions.set(target.index, support);
        }
      } catch { /* An optional support failure must not fail this topic or chapter. */ }
    }));
    if (!additions.size) return lesson;
    return { ...lesson, slides: lesson.slides.map((slide, index) => additions.has(index) ? { ...slide, teaching_support: additions.get(index) } : slide) };
  } catch { return lesson; }
}
