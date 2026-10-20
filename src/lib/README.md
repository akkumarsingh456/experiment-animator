# Helper module index

[Application structure](../README.md) · [Feature reading paths](../../docs/FEATURE_READING_PATHS.md)

Find a file by the responsibility below, then read its exports and callers.
This index describes the existing modules. It does not enable optional services,
change model settings, or alter processing rules. Some helpers are shared or
retained for specific workflows; an exported function is not proof that every
lesson invokes it.

## Class chapter and resource catalogues

| File | Responsibility |
| --- | --- |
| [`ncert-syllabus.ts`](ncert-syllabus.ts) | Class, subject, chapter, and subtopic catalogue helpers. |
| [`ncert-subtopics-extra.ts`](ncert-subtopics-extra.ts) | Additional curated subtopics merged with the syllabus. |
| [`english-chapters.ts`](english-chapters.ts) | English reader and chapter entries. |
| [`social-science-chapters.ts`](social-science-chapters.ts) | Social Science chapter names, parts, and source-matching metadata. |
| [`catalog.functions.ts`](catalog.functions.ts) | Server functions that list chapters and subtopics. |
| [`lesson-resources.ts`](lesson-resources.ts) | Resource catalogue and selection for lessons. |
| [`ncert-manuals.ts`](ncert-manuals.ts) | Selection of relevant manual links. |
| [`ncert-manual-catalog.json`](ncert-manual-catalog.json) | Data used by the manual-link catalogue. |

## Lesson preparation and topic content

| File | Responsibility |
| --- | --- |
| [`generate.functions.ts`](generate.functions.ts) | Main lesson-generation server functions and shared slide definitions. |
| [`ncert-teacher-notes.ts`](ncert-teacher-notes.ts) | Teacher-note construction, source excerpts, and formula supplements. |
| [`learning-design.ts`](learning-design.ts) | Subject-family learning profiles, scaffolds, and review helpers. |
| [`generation-timing.ts`](generation-timing.ts) | Request timeout and preparation-clock helpers. |
| [`lesson-textbooks.ts`](lesson-textbooks.ts) | Identification and reading of lesson textbook sources. |
| [`lesson-source-scope.ts`](lesson-source-scope.ts) | Restricts source pages and formula evidence to the relevant chapter or reader. |
| [`topic-evidence.ts`](topic-evidence.ts) | Selection of topic-specific source evidence. |
| [`uploaded-reference-notes.ts`](uploaded-reference-notes.ts) | Adds matched uploaded reference-note material. |
| [`med-easy-supplements.ts`](med-easy-supplements.ts) | Matched reference formula explanations and supplements. |
| [`source-quiz.ts`](source-quiz.ts) | Practice questions based on source material. |
| [`source-derivations.ts`](source-derivations.ts) | Extracts and groups formula derivation blocks from source text. |
| [`source-formula-supplements.ts`](source-formula-supplements.ts) | Matches source-supported formula rules and lines. |
| [`physical-chemistry-revision.ts`](physical-chemistry-revision.ts) | Physical Chemistry revision selection and formula content. |
| [`physics-formula-reference.ts`](physics-formula-reference.ts) | Physics problem-solving formula references. |
| [`physics-dimensions.ts`](physics-dimensions.ts) | Dimensional formula information and explanatory notes for Physics. |
| [`social-revision-notes.ts`](social-revision-notes.ts) | Social Science revision-note additions. |

## Source books extraction and preparation

| File | Responsibility |
| --- | --- |
| [`pdf-extract.ts`](pdf-extract.ts) | Loads PDF tooling, extracts text, and divides text into chunks. |
| [`ingest.functions.ts`](ingest.functions.ts) | Upload tickets, stored book/page/chunk operations, and ingestion helpers. |
| [`reference-books.ts`](reference-books.ts) | Reference-book identification and class/subject/chapter matching. |
| [`reference-visuals.ts`](reference-visuals.ts) | Encodes and separates reference text, context, and visual metadata. |
| [`reference-capture.functions.ts`](reference-capture.functions.ts) | Saves captured reference-page information. |
| [`reference-ocr.functions.ts`](reference-ocr.functions.ts) | Scanned-page reading, extracted-page saving, and completion handling. |
| [`prepare-reference-books.ts`](prepare-reference-books.ts) | Coordinates preparation of scanned reference sources. |
| [`book-image-gateway.ts`](book-image-gateway.ts) | Requests and parses structured responses for reference page images. |
| [`book-preparation.ts`](book-preparation.ts) | Preparation progress, subscriptions, pause/resume, and invalidation. |
| [`book-read-recovery.ts`](book-read-recovery.ts) | Retry support for book-reading failures. |
| [`local-book-reader.ts`](local-book-reader.ts) | Creates the local book-reading workflow. |
| [`local-book-index.ts`](local-book-index.ts) | Recognises chapter context in local book pages. |
| [`book-chapter-priority.ts`](book-chapter-priority.ts) | Contents parsing, chapter canonicalisation, and reading priority. |
| [`reference-note-normalizer.ts`](reference-note-normalizer.ts) | Subject-aware formula and note normalisation, plus diagram-label filtering. Formerly `pwNotesNormalizer.ts`; its exports are unchanged. |
| [`teacher-pdf-pages.ts`](teacher-pdf-pages.ts) | Prepares original teacher PDF pages for display. |
| [`lesson-book-pictures.functions.ts`](lesson-book-pictures.functions.ts) | Loads chapter-matched book picture information. |
| [`lesson-book-pictures.ts`](lesson-book-pictures.ts) | Merges loaded book pictures and prepares export notices. |

## Notation and source presentation

| File | Responsibility |
| --- | --- |
| [`latex-notation.ts`](latex-notation.ts) | Splits, normalises, validates, and converts mathematical text. |
| [`latex-autofix.ts`](latex-autofix.ts) | Local and configured-service repair helpers for invalid LaTeX. |
| [`formula-notation.ts`](formula-notation.ts) | Formula cleanup, notation repair, and configured structured formula requests. |
| [`formula-presentation.ts`](formula-presentation.ts) | Converts formula content into presentation-ready form. |
| [`formula-visual-cards.ts`](formula-visual-cards.ts) | Builds formula card data. |
| [`chemical-notation.ts`](chemical-notation.ts) | Chemical species and chemical text notation. |
| [`optics-notation.ts`](optics-notation.ts) | Repairs or joins optics-specific notation fragments. |
| [`quantum-number-notation.ts`](quantum-number-notation.ts) | Quantum-number notation presentation. |
| [`lanthanoid-table.ts`](lanthanoid-table.ts) | Lanthanoid source-row recognition and orbital notation. |
| [`source-math-repair.ts`](source-math-repair.ts) | Repairs mathematical extraction problems in source lines and slides. |
| [`source-note-quality.ts`](source-note-quality.ts) | Detects source tasks, unreadable relations, collapsed tables, and print intrusions. |
| [`ncert-display-cleanup.ts`](ncert-display-cleanup.ts) | Display cleanup of NCERT text and slide content. |
| [`note-source-noise.ts`](note-source-noise.ts) | Recognises contents listings among extracted text. |
| [`source-index-presentation.ts`](source-index-presentation.ts) | Identifies textbook index material and presents its entries. |
| [`note-labels.ts`](note-labels.ts) | Classifies and normalises note labels such as definitions and units. |
| [`note-label-presentation.ts`](note-label-presentation.ts) | Presents note labels consistently. |
| [`note-points.ts`](note-points.ts) | Divides prose and sections into readable points. |
| [`chemistry-note-presentation.ts`](chemistry-note-presentation.ts) | Chemistry presentation cleanup. |
| [`chemistry-note-layout.ts`](chemistry-note-layout.ts) | Chemistry typography, collapsed-table detection, and slide layout. |
| [`chemistry-note-sequence.ts`](chemistry-note-sequence.ts) | Arranges Chemistry note content. |
| [`mathematics-presentation.ts`](mathematics-presentation.ts) | Mathematics display handling, including damaged matrix excerpts. |
| [`social-note-presentation.ts`](social-note-presentation.ts) | Social Science display text and slide presentation. |

## Layout pagination and topic order

| File | Responsibility |
| --- | --- |
| [`topic-lecture-order.ts`](topic-lecture-order.ts) | Orders existing topic sections and groups without generating replacement content. |
| [`guided-notes.ts`](guided-notes.ts) | Groups note entries for guided display. |
| [`lecture-pages.ts`](lecture-pages.ts) | Divides lecture sections into pages using estimated rendered rows. |
| [`notes-paging.ts`](notes-paging.ts) | Creates note blocks and paginates grouped content. |
| [`guided-slides.ts`](guided-slides.ts) | Presentation dimensions, measured article pagination, and fit helpers. |
| [`slide-space-organizer.ts`](slide-space-organizer.ts) | Meaningful-slide checks and balancing of existing page content. |
| [`slide-layout-check.ts`](slide-layout-check.ts) | Layout measurement, content comparison, and materialised layout helpers. |
| [`flow-layouts.ts`](flow-layouts.ts) | Builds flow-graph nodes, edges, and layout data. |

## Med Easy reader and manual images

| File | Responsibility |
| --- | --- |
| [`manual-book-links.functions.ts`](manual-book-links.functions.ts) | Finds eligible book links and chapter-page suggestions. |
| [`manual-book-links-cache.ts`](manual-book-links-cache.ts) | Reuses recent book-link lookup results. |
| [`med-easy-contents.ts`](med-easy-contents.ts) | Supported edition-specific chapter starts. |
| [`manual-chapter-navigation.ts`](manual-chapter-navigation.ts) | Resolves chapter pages through PDF bookmarks, labels, or bounded heading checks. |
| [`manual-pdf-cache.ts`](manual-pdf-cache.ts) | Reuses parsed PDF documents and creates the reader URL. |
| [`manual-pdf-stream.server.ts`](manual-pdf-stream.server.ts) | Server-side PDF streaming and range-request handling. |
| [`manual-image-import.ts`](manual-image-import.ts) | Import eligibility, image search URLs, credits, and transferred-image helpers. |
| [`manual-visuals.ts`](manual-visuals.ts) | Manual visual state, loading, and saving. |

## Diagrams and illustrations

| File | Responsibility |
| --- | --- |
| [`napkin-infographic.ts`](napkin-infographic.ts) | Existing local lesson and notebook-style illustration renderer; the name does not imply a request to an external Napkin service. |
| [`cheatsheet-infographic.ts`](cheatsheet-infographic.ts) | Renders revision cheatsheet illustrations. |
| [`note-diagram.ts`](note-diagram.ts) | Builds note diagrams and supports configured diagram assistance. |
| [`source-concept-map.ts`](source-concept-map.ts) | Extracts source concept facts and renders a concept map. |
| [`topic-science-visuals.ts`](topic-science-visuals.ts) | Topic-specific science drawings and icon overviews. |
| [`atomic-topic-diagrams.ts`](atomic-topic-diagrams.ts) | Atomic-topic educational drawings. |
| [`chapter-topic-diagrams.ts`](chapter-topic-diagrams.ts) | Additional chapter-specific drawings. |
| [`chemistry-structure-diagrams.ts`](chemistry-structure-diagrams.ts) | Chemistry structure drawings. |
| [`current-electricity-diagrams.ts`](current-electricity-diagrams.ts) | Current-electricity diagrams and textbook drawing wrappers. |
| [`geometry-diagrams.ts`](geometry-diagrams.ts) | Geometry drawings. |
| [`classroom-visuals.ts`](classroom-visuals.ts) | Discussion illustrations and key-point visual cards. |
| [`diagram-search.functions.ts`](diagram-search.functions.ts) | Diagram search and import server functions. |
| [`hf-image-provider.server.ts`](hf-image-provider.server.ts) | Optional server-side external context-illustration provider. |

## Experiments photographs and videos

| File | Responsibility |
| --- | --- |
| [`experiment-activities.ts`](experiment-activities.ts) | Experiment activity records, matching, display selection, and video links. |
| [`experiment-drawing.ts`](experiment-drawing.ts) | Experiment recognition and drawing. |
| [`experiment-timeline.ts`](experiment-timeline.ts) | Complete experiment sections, reading-paced durations, and lossless caption paging. |
| [`experiment-photographs.ts`](experiment-photographs.ts) | Loads apparatus photos and assembles photographic experiment views. |
| [`experiment-photo-assets.json`](experiment-photo-assets.json) | Apparatus photo asset metadata. |
| [`experiment-videos.ts`](experiment-videos.ts) | Selects relevant experiment videos. |
| [`experiment-video-sources.ts`](experiment-video-sources.ts) | Resolves experiment video sources. |
| [`experiment-video-catalog.json`](experiment-video-catalog.json) | Experiment video catalogue data. |

## PDF and PowerPoint export

| File | Responsibility |
| --- | --- |
| [`lesson-pdf.ts`](lesson-pdf.ts) | Worksheet slicing and rendered lesson PDF downloads. |
| [`lesson-slide-export.ts`](lesson-slide-export.ts) | Prepares rendered slide frames and creates PowerPoint downloads. |
| [`export-fonts.ts`](export-fonts.ts) | Collects font CSS required for export. |
| [`export-images.ts`](export-images.ts) | Prepares images before capturing an export. |

## Library access requests and background work

| File | Responsibility |
| --- | --- |
| [`library-access.functions.ts`](library-access.functions.ts) | Returns current library access information. |
| [`library-access.server.ts`](library-access.server.ts) | Reads identity and enforces administrator access for restricted operations. |
| [`library-auth.ts`](library-auth.ts) | Middleware requiring library administrator authority. |
| [`library-login.ts`](library-login.ts) | Login return-path and Google sign-in option helpers. |
| [`library-books.functions.ts`](library-books.functions.ts) | Lists available library book records. |
| [`library-build.functions.ts`](library-build.functions.ts) | Enqueues, reports, and controls library preparation work. |
| [`book-requests.functions.ts`](book-requests.functions.ts) | Submits, lists, and reviews book requests with the existing access rules. |
| [`book-request-content.ts`](book-request-content.ts) | Request title and message formatting. |

## Review reports service clients and errors

| File | Responsibility |
| --- | --- |
| [`notes-factual-review.ts`](notes-factual-review.ts) | Report-only source wording and possible-conflict checks; does not prove universal factual correctness. |
| [`notes-review-sources.functions.ts`](notes-review-sources.functions.ts) | Loads source evidence used by the review report. |
| [`notes-quality-policy.ts`](notes-quality-policy.ts) | Shared and subject-specific generation quality constraints. |
| [`notes-verification.ts`](notes-verification.ts) | Mathematical validity and grounding validation/repair helpers; distinct from the separate report-only UI. Follow callers to determine where a helper is used. |
| [`structured-response-client.ts`](structured-response-client.ts) | Existing structured JSON model gateway requests and fallbacks. |
| [`browser-error-reporting.ts`](browser-error-reporting.ts) | Forwards browser exceptions to the hosting error collector. |
| [`error-capture.ts`](error-capture.ts) | Captures server error information for fallback handling. |
| [`error-page.ts`](error-page.ts) | Renders the server error fallback HTML page. |
| [`source-library-errors.ts`](source-library-errors.ts) | Identifies source-library setup problems and prepares messages. |

## Local editing state and shared utilities

| File | Responsibility |
| --- | --- |
| [`pen-notes.ts`](pen-notes.ts) | Pen-note state and its React hook. |
| [`pen-notes.functions.ts`](pen-notes.functions.ts) | Handwritten note conversion server function. |
| [`sim-overrides.ts`](sim-overrides.ts) | Slide keys and per-slide simulation override state. |
| [`utils.ts`](utils.ts) | The shared `cn` helper for combining CSS class names. |

## Before changing a helper

Read its exports, imports, and callers; find related tests; then read
[`NOTES_AND_VISUAL_QUALITY.md`](../../docs/NOTES_AND_VISUAL_QUALITY.md) if notes,
sources, diagrams, or exports are involved. Never infer factual accuracy from
valid mathematical syntax or a source wording match. Preserve server boundaries,
public access, generated content, and external API identifiers.
