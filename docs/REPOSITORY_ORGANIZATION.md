# Repository organisation update

[Project start](../README.md) · [Beginner guide](REPOSITORY_GUIDE.md) ·
[Documentation index](README.md)

## Purpose

Make the existing repository easier to understand without reorganising runtime
directories or changing the website. Navigation is provided through linked
Markdown guides and responsibility indexes, not a new application architecture.

## Additional descriptive filenames

| Former path | Current path | Reason |
| --- | --- | --- |
| `MIGRATION_GUIDE.ts` | [`service-setup-reference.ts`](../service-setup-reference.ts) | The existing file contains a service setup reference and exported constants, rather than a general migration procedure. |
| `src/lib/pwNotesNormalizer.ts` | [`src/lib/reference-note-normalizer.ts`](../src/lib/reference-note-normalizer.ts) | The normaliser handles multiple uploaded reference-note sources and subjects, so the filename describes that responsibility. |

Both moved files retain identical contents and export names. Only the two
normaliser import paths in `ncert-teacher-notes.ts` and `note-diagram.ts` change.
No internal importer of the former root setup-reference filename was found.

## Guides added or expanded

- The root README introduces a reading order and links to the detailed guides.
- `docs/REPOSITORY_GUIDE.md` explains GitHub, root files, terminology, and safety
  boundaries for beginners.
- `docs/FEATURE_READING_PATHS.md` identifies entry points for each major feature.
- Folder READMEs explain application entry points, components, helpers,
  configuration, hooks, integrations, documentation, and tests.
- The routes README distinguishes actual EduPlan routes from framework examples.

Every top-level helper source/data file and every top-level feature component
is included in its corresponding index. Shared `components/ui` controls remain
in their conventional tooling structure and are explained as reusable primitives.

## Compatibility requirements

Retain all framework route names, generated files, hosting metadata, external
package identifiers, service URLs, environment variables, database schema and
migrations, model settings, and authentication boundaries. Preserve existing
lesson content, prompts, diagrams, exports, and user-facing text.

Past audit records, roadmap entries, backup records, and history are not rewritten
to match the current naming. Read their original scope and dates. The guides
identify the current names without changing historical evidence.

## Verification scope

The complete offline suite passed all 2,794 tests before and after the update;
the same three opt-in live tests were skipped. TypeScript checking and production
compilation also passed. Byte comparisons confirm identical moved file contents
and import-path-only edits in the two runtime consumers.
A second complete regression run after the build also passed all 2,794 tests,
with the same three live tests skipped.

The production browser output is unchanged: all 39 JavaScript/CSS asset names,
SHA-256 hashes, and sizes match the baseline, totalling 3,802,789 bytes. No new
browser code, dependencies, requests, or runtime work was introduced.

Built-worker route checks returned the expected page responses, normalising
lesson redirect and subsequent status 200, and status 400 for a PDF request
without required parameters. The final documentation pass checked 416 local
links across 14 Markdown guides/indexes with no broken targets. Index coverage
includes all 124 top-level helper/data files, 39 feature components, and 46
shared UI controls.

These are compatibility checks, not a guarantee about every live account,
third-party service, or network condition. No paid generation or interactive
external authentication is required for this documentation and naming update.
