# EduPlan

Source code for the EduPlan lesson preparation, textbook library, presentation,
and notes application for Classes 9–12.

## Website and teacher workflow

- **Live website:** [notes-ncert.lovable.app](https://notes-ncert.lovable.app/)
- **Teacher feedback form:** [Share feedback with EduPlan](https://docs.google.com/forms/d/e/1FAIpQLSfzLxTHO5q_lwxhY2gGgukxzYZLUXBi9ATagdQzYxIytKKZ7w/viewform)

EduPlan is a lesson-preparation workspace for teachers. It brings source-based
notes, classroom presentation views, diagrams, activities, exam questions, and
lesson exports into one workflow. Students can also use the prepared materials
for revision. The available class and subject catalogues vary; check the website
for current coverage.

### How a teacher uses the website

1. **Choose the lesson scope.** Select a class, subject, chapter, and the topics
   to teach.
2. **Prepare the lesson.** EduPlan looks for readable material from the matching
   textbook sources available in its library and builds the lesson within that
   class, subject, and chapter scope. It does not substitute another class's
   textbook when the matching source is missing.
3. **Review the result.** Read the guided notes or presentation slides. Open the
   source-review report to see wording matches, items that need review, and
   possible conflicts. The report is a review aid, not a guarantee that every
   statement is correct.
4. **Add teaching resources.** Where available, use topic diagrams, import and
   crop an image, consult experiment material, and review chapter-linked
   questions. Teachers can write or paste their own notes. The optional Gemini
   topic assistant can draft supplementary points for review before insertion.
5. **Save and plan.** Continue with device drafts, or sign in to keep confirmed
   lesson backups and private next-class plans in the Teacher workspace.
6. **Teach, share, or revise.** Present the lesson and download the available
   guided notes or presentation as PDF or PPTX.

### Main features and why teachers use them

| Feature | How it helps |
| --- | --- |
| Class- and topic-scoped lesson preparation | Keeps the chosen teaching scope visible while notes and slides are prepared from matching sources. |
| Guided notes and presentation slides | Gives teachers a reading/teaching view and a classroom presentation view of a lesson. |
| Source-review report | Helps teachers locate matching, unmatched, or potentially conflicting source wording for manual checking. |
| Editable topic notes | Teachers can add reviewed AI suggestions or write/paste their own points; added points can be managed separately from original textbook notes. |
| Diagrams and experiment resources | Supports visual explanation with available topic drawings, imported images, experiment videos, and manual PDFs. Availability depends on the topic and source collection. |
| Chapter-wise question resources | Helps teachers review available exam questions alongside a chapter and use them to guide class emphasis. Extracted text should be checked against the original paper. |
| Teacher workspace | Stores confirmed private lesson backups and next-class plans for later use when the teacher is signed in. |
| PDF and PowerPoint export | Lets teachers present online or keep copies for classroom use and preparation. |

### How the source and generation workflow works

```text
Class + subject + chapter + topics
                ↓
Find matching readable textbook/source material
                ↓
Scope and organise the evidence for the selected lesson
                ↓
Build notes, activities, topic visuals, and presentation pages
                ↓
Teacher reviews source references and any flagged content
                ↓
Teacher edits/adds notes → saves → presents or exports PDF/PPTX
```

Lesson preparation is not the same as asking a general chatbot to invent a full
lesson. Much of the main lesson structure is assembled from the matching
available textbook context and deterministic formatting helpers. The optional
Gemini topic chat is a separate, supplementary workflow; its reply should be
reviewed before it is added to lesson notes. AI access depends on the website's
server-side configuration and availability.

### Important review and coverage notes

- Text extraction quality depends on the source PDF. Image-only pages, damaged
  symbols, tables, and equations may need to be checked against the original page.
- Source wording matches and formula checks help focus review; they do not certify
  complete factual accuracy. Teachers remain responsible for checking material
  before teaching.
- Topic image matching uses available metadata/title matching in the in-app
  preview. A matching title does not prove that the diagram itself is scientifically
  suitable. Google Images opens separately and is not automatically filtered by
  EduPlan.
- Experiment videos, manual PDFs, question papers, and textbook material appear
  only where matching sources are available.
- Reading existing library books and preparing lessons remain available without
  teacher sign-in. Sign-in is for private workspace saving; source-book
  administration is restricted.

### Technical overview

- **Frontend:** React and TypeScript, with TanStack Start/Router and Tailwind CSS.
- **Server and hosting:** TanStack server functions build and retrieve lesson
  material; the production build is packaged with Nitro for Cloudflare Workers.
- **Sources and data:** NCERT and other configured textbook PDFs are ingested into
  a searchable source library. Lesson retrieval is scoped to the selected class,
  subject, chapter, and topic. Supabase/Lovable integrations support configured
  storage, authentication, and cloud features.
- **AI:** The optional topic-notes assistant uses a server-side Gemini connection
  when configured. API keys stay on the server; the main lesson workflow and
  source-review display are separate from that optional chat.
- **Educational output:** KaTeX renders mathematical notation; PDF.js and UnPDF
  support PDF reading/extraction; jsPDF supports PDF output; PptxGenJS creates
  PowerPoint files. Local topic-drawing helpers provide some diagrams without an
  image-generation API.

This overview describes the repository's current implementation. It does not
claim that every catalogue topic has complete source coverage or that every
external service is always available.

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
