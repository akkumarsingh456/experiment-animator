# Test reading guide

[Project start](../README.md) · [Feature reading paths](../docs/FEATURE_READING_PATHS.md)

Tests describe selected expected behaviours. Read the setup, input data, mocks,
and assertions before using a result as evidence. A mock replaces a dependency
inside a test; it does not demonstrate a successful real account login or live
model response.

## Find tests by feature

| Feature | Useful starting tests |
| --- | --- |
| Med Easy chapter starts | [`med-easy-contents.test.ts`](med-easy-contents.test.ts), [`manual-book-links.test.ts`](manual-book-links.test.ts), [`manual-chapter-navigation.test.ts`](manual-chapter-navigation.test.ts) |
| PDF controls and caching | [`manual-pdf-reader.test.tsx`](manual-pdf-reader.test.tsx), [`manual-pdf-cache.test.ts`](manual-pdf-cache.test.ts), [`manual-pdf-stream.test.ts`](manual-pdf-stream.test.ts) |
| Image import | [`manual-visual-editor.test.tsx`](manual-visual-editor.test.tsx), [`screenshot-book-scope.test.ts`](screenshot-book-scope.test.ts) |
| Topic order and content retention | [`topic-lecture-order.test.tsx`](topic-lecture-order.test.tsx), [`report-formula-preservation.test.tsx`](report-formula-preservation.test.tsx), [`teacher-pdf-preservation.test.tsx`](teacher-pdf-preservation.test.tsx) |
| Formula and subject notation | [`formula-presentation.test.tsx`](formula-presentation.test.tsx), [`chemistry-notation-audit.test.tsx`](chemistry-notation-audit.test.tsx), [`optics-presentation.test.tsx`](optics-presentation.test.tsx) |
| Source cleanup | [`ncert-display-cleanup.test.tsx`](ncert-display-cleanup.test.tsx), [`repeated-source-syntax.test.ts`](repeated-source-syntax.test.ts), [`source-index-presentation.test.tsx`](source-index-presentation.test.tsx) |
| Layout | [`slide-space-organizer.test.ts`](slide-space-organizer.test.ts), [`slide-layout-check.test.ts`](slide-layout-check.test.ts), [`presentation-layout.test.tsx`](presentation-layout.test.tsx) |
| Review reports | [`notes-factual-review.test.tsx`](notes-factual-review.test.tsx), [`notes-content-check-ui.test.tsx`](notes-content-check-ui.test.tsx) |
| Library access | [`public-learning-access.test.ts`](public-learning-access.test.ts), [`source-library-schema.test.ts`](source-library-schema.test.ts) |
| Gateway and error contracts | [`structured-response-client.test.ts`](structured-response-client.test.ts), [`browser-error-reporting.test.ts`](browser-error-reporting.test.ts) |

Other filenames identify their covered subjects or helpers. Use the test
runner's file discovery in `vitest.config.ts` rather than manually moving tests
into a new structure for appearance.

## Run existing checks

```sh
npm test
npx vitest run tests/manual-pdf-reader.test.tsx
npx tsc --noEmit
npm run build
```

The first command runs the configured test suite. The second runs one example
file. Type checking and production compilation are separate checks. A build is
not a deployment.

Some live checks require explicit opt-in and suitable service configuration.
Read those tests' guards before running them; do not enable live requests merely
to verify a documentation change. Preserve skipped-test counts in reports.

## For a filename-only change

1. Establish a working baseline.
2. Keep moved file contents unchanged and update all import/mock paths together.
3. Check for stale references and broken documentation links.
4. Run the relevant tests, type checks, and production build.
5. Compare production browser assets and check the actual built server routes.
6. Record what was and was not verified. Revert a rename if compatibility fails.

These steps do not replace live verification when a future change actually
affects an external integration or a user-facing workflow.
