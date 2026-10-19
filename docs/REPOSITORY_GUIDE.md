# Beginner repository guide

[Start page](../README.md) · [Feature reading paths](FEATURE_READING_PATHS.md) ·
[Documentation index](README.md)

## What this repository contains

A repository is a folder of project files plus a recorded history of changes.
EduPlan's repository includes the application, educational images, database
definitions, configuration, tests, and explanations for maintainers.

You do not need to read every file first. Choose one visible action, locate its
page, and follow the functions it calls. See the worked PDF example below.

## Read the GitHub file list

| GitHub column | Meaning |
| --- | --- |
| Filename or folder | Open it to read the contents. A folder groups related files. |
| Commit message | Description of the most recent recorded change affecting that item. |
| Time | Time of that recorded change; not proof of the entire project's creation date. |

A commit is a saved checkpoint. A branch, such as `main`, is a line of
development. Renaming a file creates a new change; it does not rewrite the old
history. GitHub may display `public/apparatus` as one row when a folder has only
one subfolder.

## Folder responsibilities

| Folder | What you find there | First reading step |
| --- | --- | --- |
| [`src/`](../src/README.md) | The website's application code | Read its application overview. |
| [`src/routes/`](../src/routes/README.md) | Pages, the root layout, callback, and PDF route | Find the page for the visible action. |
| [`src/components/`](../src/components/README.md) | Reusable pieces of the interface | Find the reader, form, or presentation involved. |
| [`src/lib/`](../src/lib/README.md) | Processing, rendering, export, and service helpers | Follow the component's imports. |
| [`src/config/`](../src/config/README.md) | 3D scene and simulation catalogues | These are not the text-generation model settings. |
| [`src/hooks/`](../src/hooks/README.md) | Reusable React behaviour | Start with the mobile-width hook. |
| [`src/integrations/`](../src/integrations/README.md) | Database and authentication clients | Distinguish browser and privileged server clients. |
| `public/apparatus/` | Apparatus photographs available to the website | Follow references from experiment photo helpers. |
| `drizzle/` | Database schema and ordered migrations | `schema.ts` describes the table structure. |
| `supabase/` | Supabase configuration and migrations | Read alongside the library access documentation. |
| [`tests/`](../tests/README.md) | Automated checks of expected behaviour | Read the relevant test's inputs and assertions. |
| [`docs/`](README.md) | Feature decisions, policies, and audit records | Use the documentation index. |
| `.lovable/` | Connected-project metadata and saved plans | Keep the integration's expected name and location. |

## Root files explained

| File | Purpose |
| --- | --- |
| [`README.md`](../README.md) | Starting page and links into the project. |
| [`AGENTS.md`](../AGENTS.md) | Project requirements for coding assistants. |
| [`service-setup-reference.ts`](../service-setup-reference.ts) | Existing setup reference and exported constants, previously called `MIGRATION_GUIDE.ts`. It describes particular service arrangements, not every active runtime path. |
| [`roadmap.md`](../roadmap.md) | Task planning record. Check current code and tests before treating an old task status as current evidence. |
| [`package.json`](../package.json) | Dependency declarations and development scripts. |
| `bun.lock` | Recorded dependency resolutions for reproducible installations. |
| [`bunfig.toml`](../bunfig.toml) | Bun installation settings, including the existing package release-age policy. |
| [`components.json`](../components.json) | UI component tooling settings, styles, icons, and import aliases. |
| [`drizzle.config.ts`](../drizzle.config.ts) | Database tooling configuration: schema location, migration output, and connection variable name. |
| [`eslint.config.js`](../eslint.config.js) | Selected coding rules and checks. |
| `.prettierrc` | Code formatting preferences. |
| `.prettierignore` | Files the formatting tool skips. |
| `.gitignore` | Files Git normally avoids adding, such as installed dependencies and generated build output. |
| [`tsconfig.json`](../tsconfig.json) | TypeScript checks, module resolution, and the `@/` alias. |
| [`vite.config.ts`](../vite.config.ts) | Build and development configuration using the existing hosted integration. |
| [`vitest.config.ts`](../vitest.config.ts) | Automated test configuration and file discovery. |
| `.env` | Environment values. Do not copy credentials into documentation, screenshots, examples, or commits. |

Do not infer a file's contents from its extension alone. A `.ts` reference file
may be outside the application's imported code; a Markdown document may contain
historical guidance rather than current runtime settings.

## Read a small piece of code

```ts
import { normalizeNoteLine } from "@/lib/reference-note-normalizer";
```

This asks another file for the `normalizeNoteLine` function. In this repository,
`@/` means `src/`. To understand what happens next, find the function definition
and read its inputs, return value, and callers.

| Term | Beginner explanation |
| --- | --- |
| Function | A named piece of work that accepts information and may return a result. |
| Component | A React function that describes part of the interface. |
| Import | A request to use an export from another file. |
| Export | A function, value, or type that other files may import. |
| Type | A description of the expected shape of a value. |
| Hook | Reusable React behaviour; hooks normally have names beginning with `use`. |
| Cache | Information kept for reuse instead of loading or computing it again. |
| Route | A connection between a website address and a page or request handler. |
| Migration | An ordered database structure change. |

`.tsx` commonly contains React interface code; `.ts` contains TypeScript logic,
types, or configuration. `.json` contains structured data, `.css` styling, `.sql`
database instructions, and `.md` readable documentation. In this project,
`.functions.ts` commonly groups framework server functions and `.server.ts`
identifies server-oriented modules. Read the implementation to confirm the
boundary; naming alone does not enforce every security rule.

## Follow one feature

For Med Easy import, start at
[`ManualVisualEditor.tsx`](../src/components/ManualVisualEditor.tsx). It provides
the import interface. Follow its imports to the book-link lookup, PDF reader,
chapter mapping, and cache. Then open the corresponding reader tests. The
[feature reading paths](FEATURE_READING_PATHS.md) list the exact files and the
question each one answers.

For a formula issue, begin with [`MathText.tsx`](../src/components/MathText.tsx)
and the formula presentation helpers. Distinguish a rendering issue from an
incorrect source equation; a valid display does not prove scientific accuracy.

## Run checks without confusing the stages

Use the existing package manager and lockfile for installation. The npm script
examples below refer to the existing commands in `package.json`:

```sh
npm run dev
npm test
npx tsc --noEmit
npm run build
```

Development starts a local working version. Tests check selected cases.
TypeScript checks compatible use of values and functions. A build prepares
production output. Publishing makes a build available on the live site and is
a separate action. This production build targets Cloudflare Workers; use its
recorded preview command in `.output/nitro.json` rather than assuming a generic
preview command serves the same server format.

## Safe reading and editing boundaries

Do not rename route files, generated files, integration folders, environment
variables, service URLs, database columns, or dependencies for appearance.
Their names may be part of a contract. In particular, keep `.lovable/`,
`src/integrations/lovable/`, and `src/routeTree.gen.ts` as required by the tools.

No guide here replaces the rules in `AGENTS.md` or the
[notes quality policy](NOTES_AND_VISUAL_QUALITY.md). A documentation or filename
cleanup must not alter educational content, permissions, model versions,
generation prompts, request behaviour, or the site's user interface.
