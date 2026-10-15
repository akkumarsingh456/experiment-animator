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

The committed `CURRICULUM_VISUAL_AUDIT.json` enumerates 4 classes, 26 subject streams, 177 chapter entries and 1,827 expanded subtopics (2,004 chapter/subtopic title checks). For 1,274 title checks, no suitable built-in diagram was selected; those now receive the explicit import guidance. Remaining matches are schematic capabilities, not a claim of scientific verification.

Regenerate this report with `EDUPLAN_WRITE_AUDIT=1` when running `tests/curriculum-visual-audit.test.ts`. The report includes each chapter’s unavailable topics and applicable quality constraints.
