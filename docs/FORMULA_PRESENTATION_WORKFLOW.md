# Formula presentation: required command and steps

## Scope

Use the shared `MathText` → `formulaPresentation` → KaTeX path for lesson notes, source-review entries and rendered PDF/PPTX exports. Never add a separate chapter-specific display parser. Source data, original entries, duplicate entries and unrelated wording remain unchanged. Formatting is a display transformation, not a database rewrite.

## Required checks before publishing

From the repository directory with dependencies installed, run:

```sh
npm run check:formulas
npx tsc --noEmit
npm run build
```

1. Keep uploaded extraction and saved lesson strings intact.
2. Preserve authored `$...$` and `$$...$$` expressions. Format each remaining plain-text span independently so an existing expression cannot prevent another formula from rendering.
3. Use explicit LaTeX subscripts, superscripts, fractions and upright SI units: `n_{e}n_{h}=n_{i}^{2}`, `\frac{a}{b}`, `10^{32}`, `\mathrm{m}^{-3}`. Prose such as “and” remains outside unformatted variable tokens.
4. Add a regression fixture for each confirmed failure. Require valid KaTeX and preservation of surrounding prose and source strings. Exercise ordinary notes and source review through the same renderer.
5. Never infer lost operands, powers or signs from arbitrary digits. The semiconductor recovery is restricted to the complete reported numerical example, its stated result/unit and semiconductor context. Keep uncertain extraction available for comparison with the source.
6. Run the commands above, review the resulting presentation, then publish through Lovable. Reload the published lesson to use the shared display correction. An old downloaded PDF/PPTX does not change automatically.

## Automated coverage and limits

`check:formulas` runs the reported semiconductor regressions, LaTeX parsing tests, formula supplements, damaged-source safeguards and the configured curriculum output fixtures. The new renderer fixtures cover all 294 configured chapter labels, including fractions, matrices, dimensions, chemical charges and quantum-number subscripts. These are controlled regression fixtures; they are not a factual certification of every formula in every uploaded PDF. KaTeX validity alone cannot establish scientific correctness. Unreadable OCR still requires source comparison; do not invent a plausible replacement.

## Standing implementation instruction

“Correct formula typography through the shared LaTeX presentation layer for all chapter views and exports. Preserve every original source string and all unrelated information. Add a regression fixture, run `npm run check:formulas`, type-check and build before publishing. Never delete source-review entries, deduplicate them or silently guess missing mathematical content.”


## Refraction regression safeguards

Never add a second backslash to existing LaTeX function commands during Unicode normalization: this converts sine/cosine/tangent into unintended line breaks. Check both notes and formula visual cards with `n_1\sin i=n_2\sin r`. The complete known NCERT NOM/NCM/NIM tangent triplet may recover its MN/OM, MN/MC and MN/MI fractions only through the shared display layer; arbitrary joined letters remain untouched. Keep equation (9.3), section 9.2.3 and the following prose outside the focal-length equation. Preserve source strings and generated lesson content. A Refraction topic retains the labelled refraction diagram on discussion pages; general discussion pages retain their existing illustration.

Reference for the tangent triplet: NCERT/CIET Physics-04, Leph_20906, refraction at a spherical surface, https://ciet.nic.in/moocspdf/physics%2004/leph_20906_eContent2019.pdf .


## Preserve valid authored mathematics

Before plain-text repair, preserve parseable LaTeX commands and explicit braced scripts. In particular, never strip short fraction commands or apply slash recovery inside authored subscripts such as t_{1/2}. The chapter-formula-audit suite compares the rendered MathML structure against all existing curated formula references and records coverage for every configured chapter. Run it together with chemistry notation checks through check:formulas. Reports in CHAPTER_FORMULA_AUDIT.md and CHAPTER_FORMULA_AUDIT.json distinguish available chapter references from shared-renderer checks; neither certifies unseen saved lesson content.
