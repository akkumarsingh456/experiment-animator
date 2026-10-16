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
