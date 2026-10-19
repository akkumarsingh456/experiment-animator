# Shared notes and visual safeguards

Apply these rules whenever changing extraction, retrieval, generation, rendering or exports. They apply to all configured Classes 9–12 subjects; chapter-specific constraints supplement them.

## Causes addressed

- PDF print layers repeat Example, Solution and Intext Question banners.
- Flattened tables lose the relationship between headings and values; a long grammatical sentence can conceal the corrupted rows.
- Broad `is/are`, `unit` and `Z = ...` matches previously classified questions and ordinary prose as definitions, SI units or formulas.
- A bare `series` match selected a capacitor icon for transition-element series. Generic chapter models and unrelated key terms could override the actual page.
- Vocabulary overlap and valid LaTeX measure matching/rendering, not factual correctness. The UI must describe those checks accurately.

## Always follow

1. Clean source furniture before classification, and apply the same guard when opening saved notes and building printable note blocks.
2. Preserve authored mathematical steps and quoted literary wording. Never guess an equation or align flattened table values by proximity alone.
3. Put questions in practice, not definitions or formula cards. A formula needs a readable relation; a quantity needs an explicit unit statement.
4. Quarantine unrecoverable tables; retain independently readable source explanations. Re-ingest clearer pages to restore missing material.
5. Ground each topic separately. Do not fill missing subtopics with unrelated chapter paragraphs.
6. Prefer an appropriate deterministic drawing. If none exists, say so and retain device import, Check Google and eligible Med Easy imports. Do not portray a decorative icon as a scientific diagram.
7. Never replace a user's saved imported image during an automatic visual refresh.

## Subject and chapter risks

| Subject / chapter family | Required distinction |
| --- | --- |
| Classes 9–10 Science | Resolve Physics, Chemistry or Biology using the chapter metadata before visual matching. |
| Physics: electricity / capacitors | Require actual circuit context; capacitor series networks are not resistor networks or parallel-plate geometry. |
| Physics: electrostatics | Keep potential, field, force and energy distinct; retain source signs, reference levels and assumptions. |
| Chemistry: d/f block | Separate first-row d-block properties from lanthanoid/actinoid evidence; never render electrical-series icons for element series. |
| Chemistry: tables | Reject collapsed lattice, ion-colour and oxidation-state rows rather than pairing values without verified column structure. |
| Chemistry: organic / electrochemistry | Match the named group or cell type; preserve reagents, conditions and source observations. |
| Biology / Botany / Zoology | Match organism, structure and process stage; do not default all topics to cells, blood circulation or food chains. |
| Mathematics | Preserve domains, theorem hypotheses and proof sequence; mathematical series and parallel lines do not imply circuits. |
| Computing | Preserve syntax and outputs; assignment statements are not physical formulas. |
| Languages / humanities | Preserve quotations, context and evidence; do not impose SI units or scientific diagrams. |

## Verification scope

`tests/shared-note-quality.test.ts` covers reported failure patterns and iterates the configured chapter/subtopic catalog for non-physics electrical-series leakage. This is a code/catalog regression audit, not a scientific verification of every uploaded book page or every generated lesson. No live book inventory or complete chapter-by-chapter factual review is claimed.

`notes-quality-policy.ts` supplies shared and chapter-family constraints to the generation prompt. Missing diagrams and unreadable source material remain explicit rather than being replaced with guessed content.

## Catalog snapshot

The committed `CURRICULUM_VISUAL_AUDIT.json` is the historical pre-English-expansion snapshot (177 chapter entries). English now lists individual stories and poems instead of volume placeholders, with no subtopics. That historical snapshot does not describe the expanded catalog counts.

## English chapter retrieval

- Show individual titles, grouped by textbook; do not offer volume names as chapters or thematic subtopics.
- Preserve the edition label for Class 9 legacy Beehive/Moments uploads. Do not label these as the newer Kaveri curriculum.
- Prefer the matching reader, retain source order, and stop at the next story/poem heading, including headings on a shared page.
- If the chapter heading/readable evidence is missing, request the matching PDF rather than filling notes from other chapters.
- Classes 10–12 title lists follow CBSE 2026–27 English Language & Literature / English Core prescribed readers.

Regenerate this report with `EDUPLAN_WRITE_AUDIT=1` when running `tests/curriculum-visual-audit.test.ts`. The report includes each chapter’s unavailable topics and applicable quality constraints.

## Physics dimensional formulas

Every Physics topic must distinguish the dimensions of its named quantities from SI units. Use [M^a L^b T^c], including I for electric current and Θ for temperature where necessary. Never force these independent dimensions into MLT alone. Dimensionless ratios have zero exponents. Memory tips must follow defining relations; dimensional agreement cannot prove a law or determine dimensionless constants.

`physics-dimensions.ts` supplies standard dimensional identities for explicitly named quantities, including existing saved notes when displayed. It does not infer quantities from ambiguous symbols. Unmatched concepts explicitly request a named quantity rather than inventing a chapter dimension. Display the formula, quantity and memory explanation in normal-flow cards with wrapping/overflow containment; include those sections in saved generated notes and exports.

## Continuation pages instead of note scrolling

Add all supplements (including dimensional formulas) before `paginateLectureSections`. Never append or regenerate a whole-topic supplement in a page renderer: it duplicates content and bypasses pagination. Preserve every input point when packing pages; account for headings, formula-card padding, superscripts and memory explanations. Continue long derivations at step boundaries with their target repeated. Move each dimensional card independently in guided presentations. The notes sheet has no inner vertical scrolling; use continuation slides and modest spacing instead of stretching sparse content.

## Chapter covers

`LessonCover.tsx` supplies the shared first-slide design in lecture presentation and export views. Resolve the selected subject before topic keywords (a Physics cell must not select Biology). Use exact chapter diagrams where available, otherwise clearly editorial subject-tool icons. Periodic element tiles carry correct atomic numbers and explicit d/f block colour keys. Keep cover copy separate from lesson evidence, retain the original topic list in slide data, and use a compact roadmap with an additional-topic count when the selection exceeds six entries. Do not replace note diagrams or generated lesson content when changing cover design.

## Chemistry table preservation and typography

Detect f-block/lanthanoid tables using element names, ions and orbital runs, not only d-block symbols. `chemistry-note-layout.ts` moves collapsed table material into labelled source-transcription continuation pages before shared cleaning runs. Preserve every original token in order, including headings and continuation fragments. Separate named rows; do not invent missing column-to-value correspondences. Retain independently readable explanations in the main notes and repair only unambiguous orbital exponents, ionic charges and species typography. Original table entries must bypass semantic cleanup and cross-topic deduplication in both lecture and guided views. Mark uncertain tables for textbook verification; do not label a transcription as a verified scientific table.

## Repeated PDF section headers and notebook covers

Use `stripRepeatedPrintHeaders` for repeated dotted section IDs such as `14.1 14.1 14.1`, including the adjacent running chapter/subject header when recognisable. Apply this outside LaTeX and quotations; preserve single section references and scientific numerical data. Clean the evidence before constructing classroom-discussion activity text, and keep the same cleanup when reopening saved notes.

Covers use a ruled-paper notebook/pamphlet theme with binding, tape and authored SVG pen-style motifs above and below the chapter panel. Resolve Physics decoration by the chapter family (optics, electrical, or measurement/mechanics). Retain the main chapter-specific figure and learning roadmap. These are illustrative vector drawings, not photographs of an actual experiment.

## Public homepage claims

Describe the implemented class/subject catalog, uploaded-material retrieval, automated drafting, source review, diagrams and manual imports, available activities and PDF/PPTX exports. Do not promise a fixed ten-slide lesson, every experiment, realistic 3D footage, voiceover, unlimited use or MP4 downloads without implementing and verifying those capabilities. Keep senior Biology catalog limits explicit. The homepage uses the EduPlan display name and educational/tool illustrations rather than sparkle/wand iconography. Preserve the generator controls and routes when changing its presentation.

## Chemistry teaching sequence and cover variants

`sequenceChemistryNotes` orders explicitly labelled content into definitions, composition, nomenclature, bonding/theory, isomerism, preparation, properties, reactions, conditions, uses and practice. It preserves all input lines and keeps procedures/derivations atomic. Unknown labels retain their relative order; source transcription follows the main teaching material. The generation policy specifies coordination-compound distinctions and physical/organic chapter sequences. This is organisation and notation guidance, not a factual validation of every uploaded chapter.

Chapter cover templates vary deterministically between laboratory folio, index layout, blueprint and field notebook using subject and chapter identity. Only the first slide layout changes; chapter figures, learning roadmap and content-page layout remain intact.

## Print intrusion and exercise context

Detect single running page/section headings embedded in equations, including OCR-split uppercase titles. Preserve flagged strings in labelled source-review continuation material instead of rendering them as verified formula cards. Keep exercise options and their sibling statements together for textbook answer review; an option is not automatically true. Source-review text bypasses semantic cleanup and deduplication, and must not seed classroom discussion. Induction-coil drawings require induction-specific context, never just magnet, Earth magnetism, Ampere, Biot–Savart or Lorentz keywords. These shared guards apply across configured subjects; they do not establish factual correctness of every uploaded passage.

## Additive senior Physics formula reference

`physics-formula-reference.ts` provides 175 independently authored standard formula rows across all 14 configured Class 11 and 14 Class 12 Physics chapters. Match the selected class and complete chapter title exactly after punctuation normalisation. Insert the reference once before MCQs, retaining every original slide. These are curated supplementary identities, not claims of verbatim extraction from an uploaded PDF. Keep assumptions, sign conventions and model limits beside the equations. Rectifier-average formulas are explicitly supplementary and idealised. Never attach a chapter’s complete appendix to every individual topic slide. References use full-width continuation pages and remain in guided notes and PDF/PPTX exports.

## Repeated equation syntax

Repeated differential symbols and missing operands such as `E = − = + δ δ δ δ V l V l` indicate a flattened PDF equation, not a relation to simplify. The shared math-quality guard must catch these in normal notes and saved-lesson rendering. Preserve valid LaTeX chains, repeated variables and quoted examples. Keep an unrecoverable original in source review instead of guessing its numerator, denominator or sign.

## Verified lanthanoid table display

NCERT Chemistry I, The d- and f-Block Elements, table 4.9 (https://ncert.nic.in/textbook/pdf/lech104.pdf#page=22) separates neutral-atom radii from 3+ ionic radii, both in pm. Recognised named source rows may use the verified table labels and configurations; require a matching name, symbol, orbital data and listed atomic-radius token. Never assign arbitrary flattened values by position. Keep the underlying extraction unchanged, format orbital occupancies and charges as superscripts, preserve chemical subscripts, and mark values absent from NCERT as not given. The lecture paginator must account for the labelled rows.

## Content-local overflow and exceptions

Lecture continuation packing starts with a fuller 32-row budget. Actual DOM overflow adjusts weights for only the lines on the overflowing page, never the whole source topic: a dense table must not force sparse practice pages elsewhere. Preserve source-table entries atomically before rendering verified chemistry labels. All text stays in source order; short final pages remain possible when the topic ends. Explicit exception, anomaly or unusual-behaviour wording receives bold amber emphasis in the shared math/text renderer. This is presentation of the supplied statement, not a new scientific assertion; names or numerical outliers alone must not trigger inferred exceptions.

Inline mathematical containers must reset text-indent themselves, including when nested inside shared text/highlight wrappers. Prose bullet hanging indents must never shift KaTeX back over the preceding word.

## Lesson preparation animation

`LessonPreparation.tsx` replaces only the pending-generation panel. Use subject-first chapter matching for authored local SVG motifs, with a neutral book fallback. Physics uses measurement, circuit, magnetic field, lens, wave or motion sketches; Chemistry uses element tiles, structure sketches or laboratory glassware; Mathematics uses coordinate graphs or geometry; Computing distinguishes stacks, databases and networks; Biology uses a leaf sketch. These are editorial waiting illustrations, not simulations of the selected experiment. Display the selected topic and a stable preparation message; never fabricate completion percentages or backend stages. Keep motion subtle, pausable and disabled under prefers-reduced-motion. Generation requests, timeout handling, saved notes and authentication are unchanged.

The preparation panel shows wall-clock elapsed time and time before the existing three-minute request timeout, sharing LESSON_REQUEST_TIMEOUT_MS with the request handler. It is not a completion ETA or server heartbeat. The timer keeps running while decorative animation is paused and catches up on tab visibility changes. Browser offline events show a connection warning; an online flag alone never proves backend health. Clear the timer when the panel unmounts after success or error, and restart from the actual request start on retry.

## Social Science selection and uploaded revision PDFs

The Class 9/10 generator now includes Social Science, organised by History, Geography, Political Science and Economics in `social-science-chapters.ts`. The Class 9 catalogue follows the uploaded legacy four-volume books (20 chapters), explicitly labelled as that edition, not the revised 2026–27 Class 9 curriculum. Class 10 lists 22 textbook chapters; inclusion in the textbook browser is not a claim that every chapter/subtopic is examined in the current board syllabus. Topic selections are teaching navigation labels, not quoted textbook passages.

Official references: CBSE Social Science IX–X 2025–26, https://cbseacademic.nic.in/web_material/CurriculumMain26/Sec/Social_Science_Sec_2025-26.pdf ; Class X NCERT contents https://ncert.nic.in/textbook/pdf/jess1ps.pdf (Geography), jess2ps.pdf (Economics), jess3ps.pdf (History), jess4ps.pdf (Democratic Politics).

Live read-only inventory inspection on 18 October found 35 Social Science-related metadata records, including duplicated NCERT volumes and revision PDFs. Several Political Science volumes were incorrectly stored under Science/Physics and one Economics English-medium volume under English. Resolve explicit social-book titles before generic science/language words for display, retrieval and future folder uploads. This is a read-time correction, preserving original PDFs and stored metadata. Do not infer a new class from a chapter title: Political Parties notes saved as Class 9 are not silently moved to Class 10.

The selection panel shows saved textbook and revision PDF links by class and selected chapter/discipline, retains whole-volume sources, displays load errors and supports refresh. Known chapter-specific PDFs are not shown under a different chapter. Teacher notes, mind maps and PDF presentations remain separately accessible resources; they are not relabelled as NCERT or used as primary textbook text. A Shubham Pathak authorship claim requires actual filename/source evidence; none was confirmed in the inspected filenames. Do not promise an original PPTX when the saved resource is PDF. Generation scopes the requested chapter with its discipline and falls back to ordered chunks for historical uploads without page records; if no chapter evidence is found, report it instead of using another chapter.

## Owner-identified Social Science teacher notes

The owner clarified on 18 October that chapter-named Social Science PDFs are Shubham Pathak’s notes and explicitly requested their text in lecture notes and PPT. `socialRevisionChapter` identifies a chapter by its longest matching canonical title within the record’s stored class, excluding NCERT filenames and known whole textbooks. A filename matched to another class is never moved automatically. These PDFs are excluded from primary NCERT retrieval and appended through `appendSocialRevisionNotes` as clearly labelled teacher revision slides before MCQs. Known Shobhit Nirwan filenames retain a generic teacher-source attribution rather than being relabelled as Shubham Pathak. Attribution otherwise states that it comes from the library owner, not independent author verification.

Read all saved pages in order, falling back to ordered text segments only when page text is absent; segment numbers are never described as PDF page numbers. Preserve source filenames, PDF page references, readable text and original unclear extraction. Do not invent missing PDF text or use generic questions in its place. Existing captured images may be retained only for the selected book’s saved capture paths. The shared notes and lecture/PPT renderers paginate these appended sections. NCERT content and assessment construction stay separate; cached lessons refresh teacher supplements without duplicating them, and MCQ seeds exclude teacher supplements. This changes new or reopened generation results, not browser-local edited slides already open in another session.

## Loading illustrations and source-review isolation

Loading illustrations use the selected chapter before custom topic text. Determinants and matrices use a row/column schematic; electrostatics uses charge/field imagery rather than a current circuit. Unmapped chapters use the subject notebook instead of an unrelated default graph, pendulum, stack or leaf. Shared concept maps exclude original extraction review/table sections and damaged relations. Review-only pages must not fall back to the same extracted text as Important points. Activity and discussion labels group once while retaining their source wording. These are shared presentation safeguards, not a factual verification of every stored PDF.

## Junior Social Science chapter PDFs

For Classes 9 and 10 Social Science, matching uploaded chapter notes and unchanged original PDF pages lead the generated lesson, ahead of the retained NCERT explanation and question slides. Original teacher diagrams are rendered from their own PDF pages rather than redrawn from OCR. Text presentation removes recognised textbook running titles with page numbers and numbered title headings; dates, quotations, formulas, original source-review entries and original PDF page images remain untouched. Same-class chapter matching remains required; missing chapter files must not be replaced by another chapter.

## Social Science generation audit safeguards

Match spaced headings, shortened NCERT running titles, overview-first pages and the known Latin display-font encoding used in uploaded Social Science PDFs. Prose references to earlier chapters are not chapter boundaries. Unknown legacy chapter openings stop retrieval, and duplicate textbook uploads supply one matching chapter rather than repeated copies. Class 10 Geography may use clearly attributed uploaded teacher chapter PDF pages when an NCERT volume is absent; this route must never claim those pages are NCERT text or fabricate NCERT questions. Recover a legacy Class 9 teacher import for Class 10 only for an unambiguous Class 10 curriculum title without a contradictory filename grade, preferring correctly filed PDFs when available. Combined mind maps match the first chapter heading, not generic words mentioned later on a page. See SOCIAL_SCIENCE_GENERATION_AUDIT.md for the coverage and limits of the 42-chapter audit.

## Original teacher pages and chapter audit safeguards

Automatic source-picture refresh must be additive. Never replace rendered `teacher_pdf` page images with an empty catalogue result, and never discard an existing URL when a refresh provides no signed URL. Use a full-page original layout and reject filename-only exports. Preserve meaningful historical dates and references while removing explicitly identified print furniture. Quizzes may use only complete source statements and distinct source-derived alternatives, without quota padding. Flattened English books require contents-page boundaries, including omitted legacy chapters; named Hindi/Sanskrit volumes must not be interchanged. See `POWER_SHARING_EXPORT_AUDIT.md` for the scope, observed failures and outstanding source/completeness limits. A generation check does not certify factual accuracy.

## Topic-specific dimensions and atomic diagrams

Add dimensional identities only for the quantity being taught or a named quantity/constant explicitly defined by a source relation. Incidental mentions of force, charge, energy or current must not seed an appendix. Rutherford/Bohr/spectra pages need their own atomic context; named Coulomb, Planck or Rydberg constants require an explicit relevant relation. Omit empty MLT sections and generic dimensional-analysis reminders. Rebuild older automatic MLT appendices when presenting saved lessons. Use atomic/scattering/spectral drawings before incidental electricity words can choose a circuit. Loading artwork must display the selected chapter name and labelled atomic symbols for Atoms.

At the owner's explicit request, remove only these two automatic sentences from Source review — original extraction: “These original entries contain damaged extraction or exercise options whose answer has not been established.” and “They are retained for comparison with the textbook, not presented as verified formulas or facts.” Retain every other original review entry verbatim, including damaged formulas and exercise options. Do not remove or rewrite those originals.

## Sparse continuation sheets and quantum-number typography

Keep the notes border at the natural content height, within the available slide height. Rebalance sparse final continuation pages by moving complete points in source order; never invent filler or move a derivation step away from its target. Display explicit initial/final principal quantum-number labels as n with i/f subscripts. Keep prose “and” outside unformatted mathematical tokens; preserve the source strings and numerical values. Apply this presentation fix to source-review entries as well as ordinary notes, without rewriting the original extraction.

## Shared LaTeX regression command

Follow `FORMULA_PRESENTATION_WORKFLOW.md`. Run `npm run check:formulas` before publishing formula-related changes. Use `formulaPresentation` through MathText for every rendered source-review and ordinary note entry. Preserve stored source strings, duplicate entries, page/edition text and unrelated notes. Formatting adjacent plain spans must work even when authored LaTeX already exists. Restrict recovery of collapsed scientific notation to complete, independently unambiguous expressions; never assume an arbitrary number is an exponent. Curriculum fixtures certify renderer behaviour, not the factual correctness of all uploaded content.

## Prevent sparse-page feedback loops

Measure overflow against the allocated notes viewport minus headers and padding, never against the natural height of a short notes card. Otherwise font/card changes can inflate row weights repeatedly and produce one-line continuation slides. Reset measured weights for a new lesson and on viewport resize. Retain every practice point and source-review entry; compact pagination rather than removing content. Nuclear mass-defect typography belongs in the shared formula presentation layer: E with b subscript, ΔM times c squared, MeV divided by c squared and explicit isotope super/subscripts. Preserve equation numbers and all unrelated source wording.


## Free slide spacing check

Keep the automatic spacing checkbox enabled by default. Measure every rendered PPT slide against its allocated notes viewport after fonts settle. Combine only adjacent sparse continuation pages of the same source topic, with conservative spare capacity. Never merge covers, questions, breaks or original teacher PDF pages. Preserve every source entry, formula, duplicate and its order; do not add filler. Re-measure the corrected pages independently, undo any overflowing merge, and report unmergeable short pages honestly. The verifier runs in the browser with no paid model/API. Exports and cached files must use the verified arrangement; changing the arrangement invalidates old download caches. Run the slide-layout-check and slide-layout-checkbox regression suites when changing this workflow.


## Generation is unchanged by the Slide Space Organizer

The organizer is strictly a browser presentation layer after generation. Do not modify models, prompts, generation functions, integrations, chapter matching, content, examples, teaching sequence or source strings for spacing. Omit only genuinely empty records at presentation boundaries; keep title-only dividers, original PDFs, missing source assets, equations and visual-only records. Use existing pagination for dense notes, bounded spacing for short notes, and identical guided pagination for preview and slide PDF/PPTX. Never add filler or enlarge gaps without limits. A merge must preserve every non-section field as well as all note entries, duplicate entries and their order. Clear old verification results before showing a different lesson. Fixture coverage verifies layout and preservation, not every historical lesson or factual accuracy.


## Collapsed textbook indexes in lesson notes

Dense term-and-page listings must not appear as explanations merely because OCR joined their rows. Handle confirmed listings in the presentation layer only: retain the original generated/saved object, expose the unchanged entries in a collapsed source-reference panel, and exclude those listings from teaching notes and slide exports. Use conservative page-pair density and distinct terms; preserve scientific sentences, worked examples, equations, tables, original PDF pages and all Source review / Source table entries. Do not generate replacement explanations, remove source data or change prompts, models or retrieval to address this display issue.


## Physical Chemistry final revision

Append the Physical Chemistry final revision in the presentation layer, after the existing chapter slides, guided activities, questions and answer key. Scope it to supported Class 11–12 Physical Chemistry chapters and explicit Physical Chemistry lessons. Copy every existing formula-bearing teaching entry, including multiple formulas per entry, without a count cap, mathematical rewriting or model calls. Retain stated units/conditions and source-review status; select complete existing short key notes rather than synthesising new content. Exact duplicates in the appended reference may appear once; existing slides and duplicate source entries remain untouched. Do not promote incorrect MCQ alternatives into formula facts. Reuse shared LaTeX rendering and existing pagination for final pages when all formulas cannot fit readably on one. The selected chapter cover takes precedence over a subtopic title in guided views. Preview, guided PDF/PPTX and ordinary slide PDF/PPTX must include the final revision last. This collects available formula text, not unseen formulas inside image-only PDF pages.


## Organic and Inorganic Chemistry presentation audit

Use chemistry-aware MathText in notes, source-entry presentation, derivations and formula cards. Preserve element-symbol case, coefficients, reaction direction, reagents, conditions and authored LaTeX. Counts are subscripts; explicit ionic charges and orbital occupancies are superscripts. Use the already installed KaTeX mhchem extension for written chemical formulas, grouped species and coordination complexes. Do not guess missing charges, isotope numbers, ambiguous OCR or table columns. Keep chemical macro bodies opaque to generic Unicode normalization.

Hide only exact duplicate ordinary prose entries inside the same original chemistry notes section. Preserve original arrays and source strings; never deduplicate source review/table entries, reactions, procedures, derivations, examples, conditions, practice or entries from distinct sections/topics. This review covers renderer behaviour and representative configured Organic/Inorganic chapter fixtures, not a factual audit of every saved uploaded PDF. Models, prompts, retrieval, synthesis and content generation remain unchanged.

Notation references: IUPAC Green Book, https://iupac.org/wp-content/uploads/2025/03/IUPAC-GB4Abridged.pdf ; KaTeX mhchem extension, https://github.com/KaTeX/KaTeX/blob/main/contrib/mhchem/README.md .

## Biomolecule formula spacing

Present explicit spaced CH/NH/OH atom counts and the fully written grouped leucine side-chain fragment through chemistry MathText. Typeset explicit inverse-mole energy units with upright units and superscript -1. Preserve surrounding table fragments, page references, prose, numbers and authored math; do not reconstruct missing amino-acid table columns or change stored notes.


## Combined Science notation

Route the exact Science subject through the existing explicit chemical-notation formatter, as well as Chemistry. Do not match Computer Science or Social Science. Preserve authored physics mathematics and source prose. The selected-subjects audit covers only the screenshot subjects for Classes 9-12 and records chapter-level local-reference limits in SELECTED_SUBJECT_FORMULA_AUDIT.md.


## NCERT print furniture and repeated-word display cleanup

The user's latest instruction authorizes removing clear NCERT running-header intrusions and accidental adjacent repeated function words from displayed ordinary notes only. Use ncertNotesDisplaySlide after generation and cleanNcertDisplayText through shared note-label rendering; leave stored notes, model settings, prompts, generation/retrieval functions and original teacher pages unchanged. Require a recognised running title, an edition range and a page number together before hiding that print furniture. Do not remove arbitrary numbers, historical/economic dates, equation/figure/exercise numbers, values, coefficients, steps, mathematical spans, code or quotations. Preserve source-review/source-table entries and repeated source rows verbatim. Do not collapse grammar such as "had had" or "that that", repeated variables or numeric values. Keep concept-map/recap display consistent with ordinary notes. Run check:selected-subjects for the selected 189-chapter renderer/cleanup fixtures; these fixtures do not certify the factual accuracy of every saved lesson.


## Fast Med Easy reader and exact chapter pages

Keep book reading separate from lesson generation. Reuse parsed range-loaded PDFs and share fresh/pending manual-book link requests between slide panels. Recheck unindexed results after five seconds and do not cache failures. The selected physical page takes precedence over the first suggested page. Saved native chapter headings can supply a page when optional metadata is missing; an explicit new heading overrides inherited chapter metadata. Never combine physical page numbers from separately uploaded duplicate PDF copies. Resolve missing destinations using exact chapter bookmarks, unique explicit PDF labels for an attested printed range, or a bounded native-text heading check. Do not guess a PDF offset, perform a whole-book OCR scan on open, or label page one as the selected chapter when it is unverified. Keep manual page navigation/device import available and show loading, chapter-search and rendering status. Cancel abandoned chapter-search work and destroy failed PDF loading tasks immediately on Retry. No paid services or changes to models/prompts/notes are required.


## Separate factual/source-content review

Keep NotesContentCheck independent of generation, prompts, model choice, stored notes and export availability. Load separate existing textbook records through the read-only source endpoint with exact class/subject/chapter scope, excluding reference-only books via readLessonTextbooks. Never use slide grounding, model-authored quotes or generated notes as their own evidence. Compare complete source sentence wording rather than substring/word overlap; do not approve a shortened statement that drops a condition. Flag possible numeric/negation conflicts conservatively with the corresponding source sentence; a different worked example can be legitimate. Missing/unmatched/paraphrased claims remain needs-review, never automatically false or verified. Quiz alternatives, tasks, original source-review rows and image-only pages must not be promoted to verified assertions. Valid LaTeX is not a factual check. Keep every original note unchanged and state partial/missing source coverage. Do not claim an error-free lesson or a complete factual certification. Live cache review is explicit opt-in via EDUPLAN_LIVE_CONTENT_REVIEW=1, read-only and free of generation/model calls.


## View-only report and saved-formula retention

The source report is a collapsed, view-only section; begin source reads only when it is opened, leaving normal lesson viewing unaffected. Review status must never be an input to note filtering, formula regeneration, pagination, PPT/PDF downloads or the lecture plan. Preserve existing saved MLT rows and problem-solving formula references in presentation repair; an inferred replacement appendix must not overwrite a saved formula section. Pass preserveExisting=true only from the slide/guided presentation paths. The generation pathway continues using its original dimensional-inference behaviour, prompts and models. User screenshots identify 340c183 as the working baseline; comparisons show the report addition did not edit generation or saved content. Verify report toggling leaves original arrays and rendered lesson content intact.
