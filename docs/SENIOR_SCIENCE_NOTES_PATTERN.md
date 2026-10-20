# Class 11–12 Physics and Chemistry: substantive notes and relevant activities

The submitted Gravitation presentation contains 43 rasterised pages. Representative pages devote most of their space to repeated Evidence workshop instructions, materials and differentiated practice, with relatively little topic explanation. Existing downloads are not rewritten automatically.

## Implemented pattern

- Cover the configured chapter topics through `subtopicsFor`, including curated supplements, when generating a whole chapter. Keep topic evidence strictly inside the selected chapter.
- Read complete matched numbered sections, with heading aliases such as Escape velocity / Escape speed. Keep definitions, explanations, properties, conditions, equations, source derivations and worked examples. A rewrite with less than 75% of the local factual text length is rejected; that length safeguard is not a semantic completeness guarantee.
- Remove known generic workshop blocks and explicitly mismatched activity blocks from the rendered note sections. Do not remove factual notes, formulas, derivations or source worked examples merely because their wording differs from the title.
- Where supported, provide one short topic task: derivation tracing, written reaction analysis, graph interpretation, formula interpretation or concept explanation. Paper analysis is labelled as teacher-designed, not an NCERT experiment or a real measurement.
- Add an Activity conclusion from verified note text or the activity's explicit source result. Reject historical fragments, list prefaces, apparatus arrangements, unresolved comparisons and malformed/raw equations as conclusions. If an actual activity's outcome is absent, label it unavailable instead of guessing.
- Keep one concise revision self-check instead of adding a repeated generic seven-part classroom packet. No irrelevant practical is required to make otherwise useful notes pass the structural review.
- Use a new generation-cache version for this class/subject scope. Publish and regenerate existing lessons to replace their old cached pattern.

## Source font repair

`ncert-prose-decoding.ts` recognises the ASCII-offset font in some NCERT paragraphs/headings, including the Gravitation source. It decodes only densely encoded, recognisable prose or known/numbered headings. Isolated and mixed-font mathematics is unchanged and remains subject to existing corruption guards. This does not reconstruct missing equations.

## Checks and limitations

`senior-study-notes.test.ts` exercises the new pattern across all 47 configured senior Physics/Chemistry chapters, plus relevant conclusions, wrong-topic activity rejection, source preservation, missing results, numbered sections and font decoding. These catalog fixtures are not factual verification of every uploaded lesson.

`SENIOR_SCIENCE_RETRIEVAL_AUDIT.json` records an additional retrieval check against 46 downloaded official NCERT chapter PDFs. The Laws of Motion PDF download failed. Among 562 topics in the downloaded chapters (including curated extras), 17 had no section/lexical match. A keyword match does not establish a complete chapter or a correct equation. Missing edition-specific material and unreadable formulas still need matching source pages. No fallback facts were invented or bundled into the application.

Teacher-notes generation has not been verified against every live uploaded book or deployed lesson. The source audit and tests support the stated retrieval and structural fixes, not a blanket accuracy guarantee.
