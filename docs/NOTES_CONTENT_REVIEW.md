# Independent notes source/content review

## What the website adds

The selected Class 9-12 subject lesson screens have an enabled-by-default, free source-check panel. It reads the existing matching uploaded textbook chapter separately from the lesson-generation pathway. Repeated source requests are cached for five minutes; Check again retries a source read. Checking never changes or regenerates notes, invokes an AI model, writes source records or blocks existing exports.

The review distinguishes:

- **Source wording match:** the complete sentence occurs in the separate saved source. This is a wording match, not independent proof that the textbook or OCR is correct.
- **Possible conflict:** a closely corresponding source sentence has different numerical values or negation, or a mathematical fragment cannot be rendered reliably. The corresponding source is shown. Different examples may legitimately have different values; the tool does not invent a replacement.
- **Needs review:** there is no exact source sentence match, the notes are paraphrased, or readable chapter evidence is missing. This does not mean the claim is false.

## Safeguards

Only same-class, matching-subject chapter sources are used. Known reference-only uploads stay out of the primary-textbook comparison. Unknown chapters do not fall back to whole-book text. Model-authored slide grounding, quotes and note lines are never treated as independent evidence. Complete sentence matching prevents a substring with a dropped limiting condition from receiving a wording-match status. Source exercise alternatives and note quiz options are not promoted to facts. Image-only pages and truncated source coverage are explicitly reported.

## Verification and limits

The regression fixtures include numerical changes, reversed negation, omitted conditions, paraphrases, missing evidence, source exercise options, unchanged stored fields and every one of the 189 selected configured chapter labels. These are software checks, not a factual certification of every textbook claim. The explicit opt-in live review reads accessible saved lesson-cache records and existing public textbook text without generating content or writing records. Run it only with EDUPLAN_LIVE_CONTENT_REVIEW=1; its output is saved locally in outputs/LIVE_NOTES_CONTENT_REVIEW.json.

No automated method here can promise error-free notes. Unresolved statements, source errors, OCR ambiguities, scientific conditions, calculations and interpretation still require comparison with a reliable source and, where needed, a subject teacher. Existing notes remain unchanged while issues are made reviewable.
