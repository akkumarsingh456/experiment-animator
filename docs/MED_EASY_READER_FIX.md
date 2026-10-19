# Med Easy reader: speed and chapter-page corrections

## Changes

- Share pending and fresh chapter-book lookups between slide panels; reuse verified results for 60 seconds. Unindexed results expire after five seconds so newly prepared pages can appear. Failed requests are retryable.
- Keep existing PDF byte-range loading and parsed-document reuse; do not download or OCR the entire book to locate a chapter.
- Recognise actual saved chapter headings even without optional indexing metadata. Visible new chapter headings take precedence over inherited metadata.
- Keep page indexes attached to one physical PDF upload. Duplicate copies can have different cover-page offsets and must not share page numbers.
- Open the explicitly selected saved page, with the first suggestion as a fallback. Resolve unindexed chapters using exact bookmarks, unique actual PDF labels, or bounded native-text probes near an attested printed range and the early pages.
- Show an unresolved-chapter message instead of presenting PDF page 1 as a chapter match. Readers can deliberately browse the contents or enter a page number.
- Show loading/search/rendering status. Cancel obsolete chapter searches and destroy failed loading tasks on Retry.

## Verification and limits

Regression tests cover saved headings without metadata, stale chapter metadata, differently paginated duplicates, lookup caching/retry/expiry, bookmarked destinations, physical page labels, verified native headings, bounded requests, cancellation, explicit page selection, unresolved chapters, manual navigation and existing image-import/download controls. These are deterministic local checks, not a measured live-network speed benchmark.

Scanned books without saved page indexes, native text or bookmarks cannot provide a verified chapter destination through a fast text lookup. The reader reports that condition rather than inventing an offset; existing book preparation or manual navigation remains available. First-open speed still depends on PDF size, storage response and the network. No lesson models, prompts, stored notes or generation workflow are changed.
