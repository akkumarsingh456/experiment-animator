# Reported C–X bond failure

The earlier audit classified this topic as corrected because extraction from a downloaded SATHEE chapter passed. It did not demonstrate reliable production retrieval. Consequently this topic was outside the 401-topic online supplement allowlist, and a failed live NCERT lookup could still reach the reported error. The precise deployed request failure cannot be confirmed without its server logs.

The live mirror returned readable text during this investigation, but the web reader separately received HTTP 403. Neither result establishes what the deployed server received.

## Narrow repair

- Retain the reviewed, independently readable NCERT §6.3 prose in a source snapshot for Class 12 Chemistry / Haloalkanes and Haloarenes / Nature of C–X bond only.
- Use it after uploaded-source recovery fails, before depending on a live mirror request.
- Preserve provenance and pass the recovered prose through existing extraction, section building, verification and teaching-note processing.
- Omit the damaged flattened table and neighbouring preparation material.
- Leave adequate notes, other topics, the online supplement allowlist and image features unchanged.

## Evidence

20 focused regression checks passed. Both ASCII and typographic dash titles recover with network access disabled, survive the downstream verification and teaching-note stages, and pass the final completeness guard. Wrong class, subject, chapter and topic are rejected. Typecheck and production build passed. No deployed website session or full live chapter-generation run was available; deployment remains necessary before the public website uses this code.
