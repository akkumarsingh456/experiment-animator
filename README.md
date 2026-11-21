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

### Education context: NCERT's CT and AI module for Grades 9–12

NCERT's [official website](https://ncert.nic.in/?ln=en) lists its press release
and introductory Computational Thinking (CT) and Artificial Intelligence (AI)
module for the secondary stage, Grades 9–12. The release dated 23 October 2026
describes the module as aligned with the vision of NEP 2020. It highlights:

- Building critical thinking, creativity, problem-solving, and responsible use
  of emerging technologies, including for learners with no previous AI
  knowledge.
- Introducing CT as a systematic approach to problem-solving and helping learners
  understand how AI works, its applications, possibilities, and limitations.
- Experiential, activity-based learning through discussion, practical exercises,
  experimentation, and reflection; activities may be conducted with or without
  digital devices.
- Ethical and safe AI use, including data privacy, misinformation, fairness,
  digital safety, and critical verification of AI-generated information, while
  keeping human judgment, creativity, and ethical responsibility central.

EduPlan is a teacher-led preparation tool for Classes 9–12. Its source review,
editable notes, activity resources, experiment materials, and optional reviewed
AI assistance can support teachers preparing classroom explanations and
activities. This is a connection in purpose; **EduPlan is not the NCERT CT/AI
module and is not presented as NCERT-endorsed**.

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

### NCERT textbook reader, navigation, and highlights

- **English-edition selection:** The NCERT reader filters out books identified as
  Hindi editions and checks other uploaded PDFs for the same class and subject.
  English filenames do not have to contain the word `English`; neutral filenames
  can be considered when the language is not explicitly identified. Chapter
  matching is used to choose the relevant uploaded volume. If no eligible match
  is found, the reader directs the user to the uploaded-books list rather than
  silently opening a clearly identified Hindi edition.
- **Uploaded-book navigation:** The reader includes an Uploaded books link, and
  its no-match state provides a route to browse the available uploaded books.
- **Reader navigation:** When the reader is opened from the lesson presentation,
  it adds a browser-history entry. The browser Back action closes the reader
  panel and returns to the lesson; the reader also provides a **Back to lesson**
  control. Page navigation remains within the PDF reader.
- **Precise highlights:** Text selections are stored with their page number,
  colour, and selection rectangles so the highlight can be drawn over the
  selected text. Older saved highlights without rectangles use a best-effort
  text-based display fallback.
- **Local recovery:** Highlights are written to browser local storage as soon as
  they are added. They can be restored in the same browser profile after a
  refresh or reopening the same class, subject, and chapter. Local browser data
  is device/profile-specific and can be cleared by browser settings.
- **Private workspace backup:** Signed-in teachers can use **Save to private
  space** to back up the current chapter's highlights to the private
  `teacher-private-workspace` Supabase Storage bucket. The server derives the
  storage path from the authenticated user's ID and the lesson scope, validates
  the submitted highlight data, and checks that the bucket is private before
  writing. On reopening the reader while signed in, it attempts to restore the
  private copy and merge it with local highlights. Cloud backup is an explicit
  action; adding a highlight alone saves locally and does not automatically
  upload it.
- **Storage and verification note:** Private backup requires the server-side
  Supabase admin storage client and a configured Supabase environment. If the
  private bucket cannot be confirmed as non-public, the server refuses to save.
  Cloud restoration and cross-device recovery should be tested in the deployed
  environment with a signed-in teacher account. The repository changes have
  been committed, but this README does not claim that a production deployment,
  live bucket configuration, or end-to-end backup test has been verified.
- The original NCERT PDF is not modified by highlighting; highlights are stored
  separately from the source book.

### Generated text and formula cross-check

- Every newly generated lesson passes through a final server-side content check
  after the core lesson and optional teaching-support stages. Cached lessons
  also pass through this boundary before they are returned.
- The check inspects learner-facing bullets, notes, structured note sections,
  additive AI teaching-support sections and key terms for known PDF/OCR
  extraction damage, flattened calculus/equations, malformed mathematical
  notation and invalid LaTeX.
- Unclear lines are excluded from learner-facing output rather than having
  missing mathematical structure guessed. Original extraction-review sections
  are retained separately for comparison with the uploaded textbook.
- The generation result includes a `generation_review` report with the number
  of checked items, excluded items, pass status and review messages. The
  Generated lesson page displays this in **Generated text & formula
  cross-check**.
- The same line-level check is applied to the Gemini teacher-notes chat and
  source-supported missing-topic AI notes before they are returned.
- This is a conservative automated quality gate, not a guarantee that every
  scientific or mathematical statement is factually correct. Teachers should
  still compare important claims and worked solutions with the matching
  textbook. New tests cover the reported flattened instantaneous-velocity
  example, valid prose/LaTeX and additive teaching-support content.
- The repository changes have been committed, but the complete test suite and
  production build must still be run in the deployment environment.

### Supabase configuration for new-tab and SSR views

- Server-side Supabase URL and publishable-key lookup first uses the server
  environment (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`) and falls back to
  the matching build-time public settings (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`). This handles Lovable preview, SSR and
  separately opened lesson tabs where the unprefixed public settings may not
  be present in the request runtime.
- This fallback applies only to the public project URL and publishable key.
  The privileged `SUPABASE_SERVICE_ROLE_KEY` remains server-only and must be
  configured as a hosting secret. It is never read from a `VITE_*` variable.
- If the build-time public values are absent too, connect the correct Supabase
  project in Lovable Cloud and configure the public URL and publishable key in
  the website build settings, then republish. Do not paste secret keys into
  source files or commit them to Git.

### Lovable Cloud Supabase runtime bindings

- The custom server entry receives Cloudflare/Nitro worker bindings as the
  second argument to `fetch(request, env, ctx)`. It now forwards those
  bindings to a server-only runtime configuration module before invoking SSR.
- Supabase server modules resolve `SUPABASE_URL`,
  `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from those
  runtime bindings first. Public URL/publishable-key build-time fallbacks
  remain available for the browser and static build configuration.
- The service-role key is resolved only on the server and is never read from
  a `VITE_*` variable. Do not add secrets to source control.
- After syncing and publishing this change, verify the new-tab lesson route
  and a database-backed generation action in the connected Lovable Cloud
  project. If the worker binding itself is absent, reconnect the intended
  Supabase project in Lovable Cloud and republish.

### Supabase configuration in browser, SSR, and new tabs

- The browser client accepts Lovable's public `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY`, plus the supported public
  `VITE_SUPABASE_ANON_KEY` alias. Server-side URL and key aliases are also
  resolved without exposing privileged credentials.
- If the URL is not directly supplied but the connected project ref is
  available as `VITE_SUPABASE_PROJECT_ID` or `SUPABASE_PROJECT_ID`, the
  standard `https://<project-ref>.supabase.co` URL is derived.
- For SSR deployments where Lovable supplies configuration only as worker
  bindings, `src/server.ts` adds the public URL and publishable key to the
  rendered HTML so the browser and separately opened lesson tabs initialize
  with the same project. The service-role key is never injected into HTML.
- The browser resolver checks this SSR-provided public config after build-time
  values. This avoids relying on Node's `process.env` in a browser tab.
- Tests cover Vite variables, server-style aliases, project-ref URL derivation,
  and SSR-provided config. Run `pnpm test -- tests/supabase-public-config.test.ts
  tests/build-admin-access.test.ts` and a production build after syncing.
- If the connected deployment supplies neither a public URL nor a project ref
  and public key to the server, source code cannot invent the missing project
  credentials; reconnect the intended Supabase project and republish.

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
