# Chemistry notation: Classes 9–12

The shared `chemicalTextNotation` display helper is used by Chemistry and Science note rendering. Chemistry source-review text uses the same formatter after extraction-quality checks. Stored source strings and authored valid LaTeX are preserved.

## Required representation

- Element symbols retain their case: Co (cobalt) differs from CO (carbon monoxide).
- Atom counts and grouped-formula multipliers are subscripts: H₂SO₄ and Ca(OH)₂.
- Explicit ion charges are superscripts: Fe³⁺, NH₄⁺ and SO₄²⁻. An atom count is not a charge.
- Reaction coefficients stay on the baseline. Preserve arrows, state symbols, reagents and conditions.
- Orbital occupancies and hybridisation powers use superscripts, within their existing capacity checks.
- In authored isotope notation, mass number is at the upper left and atomic number at the lower left of the element symbol.
- Use mhchem/LaTeX for new generated chemistry expressions. Do not infer missing atom counts, charges, isotope positions or table columns.

Recognised spaced school-level compounds are formatted conservatively. Explicit Unicode subscripts and superscript charges are supported. Ambiguous forms such as `O2-`, `14 6 C` and element/radius columns remain unresolved rather than acquiring guessed meanings. Damaged tables remain separately reviewable.

## Coverage and limits

The notation regression audit now renders representative notes for all 27 configured Chemistry chapter entries: Class 9 Science (4), Class 10 Science (4), Class 11 Chemistry (9), Class 12 Chemistry (10), including physical chemistry. Checks also cover all 118 element symbols, compound counts, Unicode charges, coordination complexes, reactions, units, stored-text preservation, guided notes and slide-note rendering.

This is a shared formatting and catalogue-rendering audit. It is not a factual review of every formula in every uploaded book or a guarantee that an unreadable PDF can be reconstructed automatically.
