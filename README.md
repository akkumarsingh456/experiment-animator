# EduPlan

Source code for the EduPlan lesson preparation, textbook library, presentation,
and notes application for Classes 9–12.

## Start here

New to this repository? Read these guides in order:

1. [Beginner repository guide](docs/REPOSITORY_GUIDE.md): folders, file types,
   configuration, and how to follow a feature through the code.
2. [Application structure](src/README.md): page entry points and the relationship
   between components, helper functions, and external services.
3. [Feature reading paths](docs/FEATURE_READING_PATHS.md): where to start for
   lessons, PDF imports, slide layout, exports, and library access.
4. [Helper module index](src/lib/README.md) and
   [component index](src/components/README.md): individual file responsibilities.
5. [Documentation index](docs/README.md) and [test guide](tests/README.md): quality
   rules, feature decisions, and verification examples.

The guides explain the existing organisation. They do not change generation,
models, access rules, or the website interface.

## Find the relevant code

| Location | Responsibility |
| --- | --- |
| `src/routes/index.tsx` | Class, subject, chapter, and lesson preparation form |
| `src/routes/generate.tsx` | Generated lesson and presentation view |
| `src/routes/notes-library.tsx` | Source library page |
| `src/routes/history.tsx` | Saved lesson history page |
| `src/routes/upload.tsx` | Source upload page |
| `src/components/ManualVisualEditor.tsx` | Manual lesson image selection and import |
| `src/components/ManualBookPdfViewer.tsx` | Med Easy PDF reader and page import |
| `src/lib/med-easy-contents.ts` | Supported Med Easy chapter start indexes |
| `src/lib/manual-pdf-cache.ts` | Reuse of opened PDF documents |
| `src/lib/structured-response-client.ts` | Server-side model gateway client for structured formula and derivation responses |
| `src/lib/browser-error-reporting.ts` | Forwarding browser errors to the hosting platform's error collector |
| `src/lib/ncert-teacher-notes.ts` | Lesson note processing and formula supplements |
| `src/lib/formula-notation.ts` | Formula notation processing |
| `src/lib/reference-note-normalizer.ts` | Subject-aware normalisation of uploaded reference-note formulas and diagram labels |
| `src/lib/topic-lecture-order.ts` | Arrangement of existing content within each topic |
| `src/integrations/` | Authentication and database clients |
| `drizzle/` | Database schema and migration history |
| `tests/` | Automated regression checks |
| `docs/` | Feature notes, quality rules, and audit records |
| `service-setup-reference.ts` | Existing service setup reference constants; not a complete list of active model pathways |

## Development checks

Install dependencies using the repository's existing package manager and lockfile.
Then use the scripts in `package.json`:

```sh
npm run dev
npm test
npx tsc --noEmit
npm run build
```

The production build targets Cloudflare Workers through Nitro. Use the preview
command recorded in `.output/nitro.json` for that build. A successful local build
does not publish the website.

## Naming and integration boundaries

Handwritten utility filenames describe their responsibility. Imports and test
mocks must be updated together when a utility moves. Public route filenames,
generated files, external package names, environment variables, database names,
and service URLs have separate compatibility requirements.

Keep `.lovable/`, `src/integrations/lovable/`, and the Lovable package and API
identifiers intact: they support the existing hosting, authentication, and model
gateway integrations. Descriptive filenames do not change these dependencies
or the origin of the code. Do not edit `src/routeTree.gen.ts` by hand.

Follow `AGENTS.md` and `docs/NOTES_AND_VISUAL_QUALITY.md` before changing note
processing, source matching, rendering, or exports. Never commit credentials or
private source content.
