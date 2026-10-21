# Metals and Non-metals: explanation review

## Submitted PDF

Reviewed all 15 pages visually through a rendered overview, with larger renders of the first two topic pages. The document has a cover, two selected topics across four content pages, and ten MCQ pages. Its slide content is rasterised; the searchable text layer contains page labels only. No export-format change was made.

The physical-properties definition page separated “This property is called metallic lustre” and the analogous malleability sentence from the descriptions they refer to. Most chemical detail was absent. The reactivity-series pages had a definition, a procedural reference and a vague statement, without the actual ordered series or displacement explanation. Generic activity/revision scaffolding made the lack of explanation more noticeable.

## Causes and shared repairs

1. Numbered table/figure identifiers could be promoted to chapter-section boundaries. A reference such as `Table 3.1` therefore truncated the containing explanation. The shared section parser now preserves table/figure/equation identifiers as references and still stops at the next genuine section.
2. Sentence classification and later point splitting moved a property name away from its immediately preceding description. Shared source-context handling now joins those source sentences before classification, preserves them through pagination, and can restore context to saved definitions when the exact adjacent source passage is present.
3. Procedural references and instructions could inflate minimum explanatory-content counts. Those fragments no longer count as topic explanations. Orphan definitions also trigger recovery rather than counting as complete notes.
4. A short emergency passage was selected before attempting the full official chapter. Full matching NCERT mirror recovery now precedes the reviewed emergency passage; the latter remains available when the live source fails. Only supplement-cache keys were advanced to avoid reusing older short supplements.
5. The reactivity-series extraction lost its structured source table and relevant displacement context. Recovery now includes the exact source subsection on displacement and reads the complete, explicitly headed symbol/name activity-series table only when all rows and direction markers are recoverable. Missing rows or direction do not produce guessed entries.

These shared extraction/context safeguards apply to future generation across configured classes and subjects. The table-specific reader and completeness check apply only to the named reactivity-series topic. Raw source material, valid notes, existing activity order, image editing/saving/sharing, navigation and MCQ controls are preserved.

## Verification

On the previously downloaded matching official NCERT mirror chapter, the repaired pipeline recovered 107 candidate points for physical/chemical properties; 106 lines survived note building, verification and Chemistry sequencing. The reactivity-series topic recovered 13 candidate points; 12 lines survived those stages. Both passed source verification and topic completeness. Counts describe retained source points, not independent factual certification or a target number of slides.

328 focused checks, typecheck and production build passed. Coverage includes actual table-boundary behaviour, dependent definitions through paging, rejection of procedure-only notes, complete/missing series rows, saved-topic repair, existing topic ordering, Chemistry notation and prior official-source recovery.

The supplied PDF remains unchanged. Publish the synced application update, regenerate the selected chapter/topics, then export a new PDF. No deployed lesson-generation session or newly exported PDF was inspected, and this is not a factual audit of every chapter.
