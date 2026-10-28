# Feature audit — 28 October 2026

## Local verification

Full Vitest run: 122 files, 3,985 tests: initially 3,902 passed, 80 failed, 3 skipped. Investigated all six failing files. Failures were stale test expectations/mocks and a 5-second PowerPoint test timeout under concurrent build load. Updated tests for Gemini-only providers, the current textbook/insert buttons, blank-slide chat parameters, encoded SVG artwork and the supported subject-specific activity formats. Retained source-evidence rejection, explicit import, class/chapter scope, pagination-content retention and real PPTX blob assertions.

Targeted reruns resolved every initial failure: 302 curriculum tests, 11 popup/artwork tests, 7 provider/blank-slide tests and 2 PowerPoint tests passed. The PowerPoint test also passed in the first targeted four-file rerun; it now has a bounded 20-second timeout. Across the initial run and reruns all 3,982 runnable tests passed; three opt-in live stored-content audits remain skipped. This is not a factual certification of every textbook or AI answer.

TypeScript typecheck and production build passed. Existing build deprecation warnings remain. No application behavior, generation, prompts, access permissions or source books were changed.

## Live verification limits

The in-app browser failed to attach twice. Direct requests to the public home, notes library, workspace, history and upload routes all received HTTP 403 from this environment. This is an access blocker, not proof that ordinary visitors receive the same result. Therefore live generation, Gemini responses, OAuth, private cloud save/reopen, browser downloads and responsive visual behavior were not verified in this audit. No secrets were read or changed and no shared source data was modified.
