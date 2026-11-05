<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Merge curated NCERT subtopic supplements through `subtopicsFor` so every syllabus consumer receives one deduplicated list.
- Measure Teacher Notes with separate headed and plain block heights so pagination matches the headings actually rendered.
- Keep local lesson illustrations deterministic per slide identity and vary their topic icon and composition without external image APIs.
- Book capture checkpoints live in page metadata; ordinary textbook retrieval chunks stay untouched so scanning is additive to NCERT generation.
- Screenshot refresh changes only reference_visuals; render those below the existing 2D illustration with strict grade, subject, chapter and topic matching.
- Library Google sign-in uses the managed OAuth helper and a public callback; basic profiles are owner-scoped and never participate in administrator authorization.
- Follow `docs/NOTES_AND_VISUAL_QUALITY.md` for all subject/chapter changes. Keep shared extraction guards, chapter-specific evidence constraints and explicit unavailable-diagram states; never route ambiguous words such as series, cell or unit without subject context.

- Authentication restricts adding source books and notes only. Existing library reading, generation, saved lessons and PPT/PDF access stay public; never impose retrospective source approval on historical uploads.
- AI gateway lesson calls run to completion with no artificial timeout (`AbortSignal.timeout` is forbidden in `structured-response-client.ts`); the masterclass notes call uses medium reasoning effort, formula batches carry 6 slides at concurrency 6 with one retry, and the interactive lesson request window is 360s (`generation-timing.ts`). A 90-second call cap used to abort every notes request mid-generation, so tests/generation-timing.test.ts locks these values.
- PYQ question text is typeset for display only via `pyqNotation` (KaTeX/mhchem): scientific notation, powers of ten, unit powers and chemical species; stored source wording is never rewritten and unclear tokens stay plain. `presentPyq` hides unreadable box-glyph lines, confirmed scrambled OCR fragments, and bare brace/bracket debris (never in code questions); Devanagari lines stay hidden in the English-only view, and short readable abbreviations remain. Locked by tests/pyq-math-notation.test.ts and tests/pyq-question-text.test.tsx.
