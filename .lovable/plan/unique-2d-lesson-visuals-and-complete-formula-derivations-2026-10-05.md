# Unique 2D lesson visuals and complete formula derivations

## Goal
Give every lesson slide a new, topic-aware local 2D illustration with meaningful icons, while preserving the approved Teacher Notes generation flow and ensuring each formula is followed by its complete LaTeX derivation.

## Changes
- Expand the local 2D renderer into a deterministic visual system that selects subject- and topic-specific icons, diagram structures, labels, and seeded composition variants per lesson slide.
- Keep diagrams generated locally and uniquely from each slide’s title, subject, index, key terms, and lesson facts; no paid image requests.
- Improve formula extraction from each slide’s Teacher Notes and ensure every detected formula has a matching derivation group.
- Normalize formula and derivation lines through the existing LaTeX pipeline so KaTeX renders symbols, fractions, superscripts, subscripts, and equations correctly.
- Keep each formula and its entire derivation together as one unbreakable presentation unit.
- Add focused regression tests for unique visual output, icon/topic selection, formula-to-derivation pairing, and pagination grouping.

## Technical details
- Modify only additive diagram, formula-completeness, rendering, and test code; do not alter the locked NCERT-first Teacher Notes writing pipeline.
- Continue producing safe inline SVG data URLs for the lesson viewer.
- Use stable seeded variants so the same slide stays visually consistent while different slides receive distinct compositions.
- Validate with tests, current build diagnostics, and browser screenshots of the lesson view.
