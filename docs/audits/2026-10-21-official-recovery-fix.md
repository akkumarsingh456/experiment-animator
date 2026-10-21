# Official recovery for failed topics

## Reported failure

Class 10 / Science / Metals and Non-metals / Physical and chemical properties showed an official-supplement validation failure. During investigation the registered SATHEE NCERT chapter returned readable text and deterministic extraction produced 49 candidate lines. This does not establish what the deployed request received; its logs were unavailable.

One reproducible provider-flow defect was found: a non-null AI draft that failed evidence checks prevented the existing second provider from being tried. Previously only a missing draft triggered that fallback.

## Changes

- Rejected primary drafts now get one evidence-check retry and then the existing second configured provider. A failed/unavailable primary connection proceeds to the second provider without a second long primary timeout. All returned drafts still require exact source quotations and verification.
- Official source reads retry temporary failures up to three times. Only the existing approved HTTPS hosts are permitted.
- NCERT mirror parsing accepts quoted/unquoted links and current content wrappers.
- The reported topic has an exactly scoped, reviewed NCERT prose recovery passage available even if live retrieval fails. It works in both the ordinary sparse-topic recovery and the no-uploaded-source fallback path.
- Under the user's expanded request, the failed-topic fallback can now resolve exact configured Classes 9–12 topics in the six previously selected subject families. A new catalogue scope gate is separate from the historical 401-topic report. The ordinary successful-generation selection path retains its prior gate and behaviour.
- Existing chapter source bindings are reused for newly failed topics in those chapters. If none is readable, an exact matching NCERT mirror chapter is attempted where the mirror resolver supports that subject. This adds no arbitrary-URL or unverified search-snippet ingestion.
- Existing adequate notes return unchanged. External supplementation is attempted only after local NCERT strategies and the matching mirror fail. Raw uploads and image/editing/save/share controls are untouched.

## Verification and limits

122 focused checks passed, including exact catalogue scope checks, offline recovery of the reported topic through note verification, existing C–X recovery, temporary-source retries, rejection of unofficial hosts, retry/fallback after rejected drafts, rejection of unsupported information, Chemistry notation and extraction safeguards. Typecheck and production build passed.

The exact reported topic can recover without a live source/AI connection. Other failed topics still require readable official evidence and, where direct extraction is insufficient, a working configured AI provider. Missing/unverifiable evidence continues to return an explicit failure rather than invented or blank notes. This is not a factual/live-generation certification of every chapter. Chrome was not connected; source research used web search and direct official-source reads. The deployed website must receive the new version before public retries use it.
