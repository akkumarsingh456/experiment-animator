# Feature reading paths

[Project start](../README.md) · [Beginner guide](REPOSITORY_GUIDE.md) ·
[Helper index](../src/lib/README.md) · [Component index](../src/components/README.md)

These paths identify files to read, not a promise that every action executes
every listed module. Start with the visible interface and follow actual imports
and callers. Preserve the existing pathway when documenting or renaming files.

## Prepare a lesson

| Question | Read |
| --- | --- |
| Where does the user choose class, subject, chapter, and subtopics? | [`routes/index.tsx`](../src/routes/index.tsx) |
| Where do catalogue choices come from? | [`ncert-syllabus.ts`](../src/lib/ncert-syllabus.ts), [`ncert-subtopics-extra.ts`](../src/lib/ncert-subtopics-extra.ts), [`catalog.functions.ts`](../src/lib/catalog.functions.ts) |
| Where is the generated lesson displayed? | [`routes/generate.tsx`](../src/routes/generate.tsx) |
| Where are lesson generation and slide definitions organised? | [`generate.functions.ts`](../src/lib/generate.functions.ts) |
| Where are sources restricted to the intended chapter? | [`lesson-source-scope.ts`](../src/lib/lesson-source-scope.ts), [`lesson-textbooks.ts`](../src/lib/lesson-textbooks.ts), [`topic-evidence.ts`](../src/lib/topic-evidence.ts) |
| Where are teacher notes and formula additions processed? | [`ncert-teacher-notes.ts`](../src/lib/ncert-teacher-notes.ts) |

Read the [notes quality policy](NOTES_AND_VISUAL_QUALITY.md) before editing this
area. A documentation improvement is not authorisation to change model versions,
prompts, subject scope, source selection, or educational content.

## Open and import a Med Easy page

| Question | Read |
| --- | --- |
| Where is the import choice offered? | [`ManualVisualEditor.tsx`](../src/components/ManualVisualEditor.tsx) |
| How are eligible books and chapter suggestions found? | [`manual-book-links.functions.ts`](../src/lib/manual-book-links.functions.ts) |
| Where are lookup results reused? | [`manual-book-links-cache.ts`](../src/lib/manual-book-links-cache.ts) |
| Which known chapter starts are available? | [`med-easy-contents.ts`](../src/lib/med-easy-contents.ts) |
| How are other verified chapter locations resolved? | [`manual-chapter-navigation.ts`](../src/lib/manual-chapter-navigation.ts) |
| How is the PDF fetched and reused? | [`manual-pdf-stream.server.ts`](../src/lib/manual-pdf-stream.server.ts), [`manual-pdf-cache.ts`](../src/lib/manual-pdf-cache.ts) |
| Where are scrolling, arrows, zoom, and import controls? | [`ManualBookPdfViewer.tsx`](../src/components/ManualBookPdfViewer.tsx) |
| Where are selected visuals kept? | [`manual-visuals.ts`](../src/lib/manual-visuals.ts) |

Distinguish physical PDF pages from printed book pages. A chapter mapping belongs
to a supported copy; do not apply one fixed offset to every book edition.

## Understand note display and notation

Start with [`MathText.tsx`](../src/components/MathText.tsx) to see mathematical
text rendering. Follow [`latex-notation.ts`](../src/lib/latex-notation.ts),
[`formula-presentation.ts`](../src/lib/formula-presentation.ts), and the relevant
subject presentation helper. For uploaded reference-note normalisation, read
[`reference-note-normalizer.ts`](../src/lib/reference-note-normalizer.ts).

The [helper index](../src/lib/README.md#notation-and-source-presentation) lists
Chemistry, optics, quantum-number, Mathematics, and Social Science helpers.
Keep a notation repair distinct from rewriting the underlying explanation.

## Understand topic order and page layout

1. Read [`topic-lecture-order.ts`](../src/lib/topic-lecture-order.ts) for the order
   of existing topic entries.
2. Read [`guided-notes.ts`](../src/lib/guided-notes.ts) for note groups and
   [`lecture-pages.ts`](../src/lib/lecture-pages.ts) for lecture pagination.
3. Read [`guided-slides.ts`](../src/lib/guided-slides.ts) for measured presentation
   pages and [`slide-space-organizer.ts`](../src/lib/slide-space-organizer.ts) for
   balancing existing content.
4. Read [`SlideLayoutCheck.tsx`](../src/components/SlideLayoutCheck.tsx) and
   [`slide-layout-check.ts`](../src/lib/slide-layout-check.ts) for layout checks.

Related decisions: [topic sequence](TOPIC_LECTURE_SEQUENCE.md) and
[slide-space organiser](SLIDE_SPACE_ORGANIZER.md). Layout and generation have
different responsibilities; avoid regenerating content to change spacing.

## Understand the source review report

The report interface is
[`NotesContentCheck.tsx`](../src/components/NotesContentCheck.tsx). It uses source
evidence from [`notes-review-sources.functions.ts`](../src/lib/notes-review-sources.functions.ts)
and the comparison logic in
[`notes-factual-review.ts`](../src/lib/notes-factual-review.ts).

Source wording matches, review flags, and possible conflicts describe the scope
of the check. They are not a universal truth score. See
[report-only formula retention](REPORT_ONLY_FORMULA_RETENTION.md) and the
preservation tests before touching the report. Other validation helpers in
`notes-verification.ts` are a separate concern; inspect callers rather than
assuming all similarly named modules have identical effects.

## Understand export preparation

For PDF output, read [`lesson-pdf.ts`](../src/lib/lesson-pdf.ts). For rendered
slides and PowerPoint output, read
[`lesson-slide-export.ts`](../src/lib/lesson-slide-export.ts). Both use
[`export-fonts.ts`](../src/lib/export-fonts.ts) and
[`export-images.ts`](../src/lib/export-images.ts) to prepare captured output.

Read pagination helpers as well when diagnosing a missing line, overflowing
formula, unloaded image, or inconsistent page break. A successful export request
does not replace inspection of its contents.

## Understand original figures and experiments

- Source figures: [`BookReferenceFigures.tsx`](../src/components/BookReferenceFigures.tsx),
  [`lesson-book-pictures.functions.ts`](../src/lib/lesson-book-pictures.functions.ts),
  [`reference-visuals.ts`](../src/lib/reference-visuals.ts).
- Local lesson illustrations: [`napkin-infographic.ts`](../src/lib/napkin-infographic.ts)
  and its subject drawing helpers. Its implementation renders local illustrations;
  the filename does not mean every illustration is sent to an external service.
- Experiments: [`ExperimentLab.tsx`](../src/components/ExperimentLab.tsx),
  [`experiment-activities.ts`](../src/lib/experiment-activities.ts),
  [`experiment-drawing.ts`](../src/lib/experiment-drawing.ts), and
  [`experiment-photographs.ts`](../src/lib/experiment-photographs.ts).
- Simulations and 3D scenes: [`config/README.md`](../src/config/README.md),
  [`SimulationViewer.tsx`](../src/components/SimulationViewer.tsx), and
  [`ThreeDViewer.tsx`](../src/components/ThreeDViewer.tsx).

## Understand library access and source management

Read the library/upload routes, then
[`LibraryAdminDashboard.tsx`](../src/components/LibraryAdminDashboard.tsx).
Continue through [`library-access.server.ts`](../src/lib/library-access.server.ts),
[`library-auth.ts`](../src/lib/library-auth.ts), and
[`integrations/README.md`](../src/integrations/README.md).

Book ingestion is organised in [`ingest.functions.ts`](../src/lib/ingest.functions.ts).
Book requests have their own functions in
[`book-requests.functions.ts`](../src/lib/book-requests.functions.ts). Public
reading, sign-in, private profiles, and administrator operations are distinct
responsibilities. Read [library access setup](LIBRARY_ACCESS_SETUP.md) before
changing them.

## Find evidence for a proposed change

Use the [test guide](../tests/README.md). Read test inputs, mocks, expected
results, and limitations. A mock does not exercise a real external account or
paid generation service. A passing offline test is evidence for its scenario,
not a claim that every production condition was checked.
