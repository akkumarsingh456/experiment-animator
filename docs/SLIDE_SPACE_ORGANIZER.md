# Slide Space Organizer

## Scope

The organizer receives completed lesson data and adjusts presentation only. Models, prompts, generation functions, integrations, chapter selection and stored lesson content remain unchanged. It is deterministic, local and requires no paid model or service.

## Processing

1. Omit genuinely empty records from presentation inputs. Retain title-only content, formulas, diagrams, original PDF pages and source assets that may need reloading. Never delete stored records.
2. Reuse lecture pagination and its measured overflow callback for dense notes.
3. Measure each PPT page, then combine only adjacent continuations with matching source identity and identical non-section data. Covers, questions, breaks and original PDF pages stay separate.
4. Compare note strings, duplicates, sequence and non-section data before accepting a merge.
5. Independently measure the resulting pages. Undo any overflowing merge and check the restored pages again.
6. Use bounded block spacing and positioning for short notes. Preserve readable text and existing illustrations; never add filler or change equations.
7. Use the same lecture pages for preview, presentation, slide PDF and PPTX. Guided presentation and its exports share the existing DOM paginator, now with empty-article handling and a bounded final spacing pass.

A very short topic can retain whitespace when no safe continuation merge is available. The checker reports it; it does not manufacture content or stretch gaps across the entire slide. Original full-page PDFs remain unchanged.

## Verification

Run `npm test`, `npx tsc --noEmit` and `npm run build`. Targeted regressions: `npx vitest run tests/slide-layout-check.test.ts tests/slide-layout-checkbox.test.tsx tests/slide-space-organizer.test.ts`.

Short, medium and heavy fixtures cover Class 9 Science (Atoms and Molecules), Class 10 Social Science (Power-sharing), Class 11 Mathematics (Quadratic Equations), and Class 12 Physics (Semiconductors). Browser preview checks exercised all twelve combinations with the actual notes renderer and lecture paginator; the completed checks reported no overflow. Short fixtures remained identified as short. These are layout fixtures, not live generation requests or a claim that every historical chapter has been visually audited.

Additional regressions check empty inputs, original assets, duplicate notes, altered diagrams, lesson changes from more pages to fewer pages, and rollback of overflowing merges. Inspect the staged diff before release: generation functions, model settings, prompts and backend files must be absent.
