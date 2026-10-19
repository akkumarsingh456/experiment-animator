# View-only report and saved formula retention

## Baseline comparison

The user identified commit 340c183 as the working Med Easy-reader baseline. The subsequent source-report commit added a separate report UI and read-only checks; it did not change the generation implementation, prompts, models or stored lessons. An older presentation helper rebuilt saved MLT appendices and could infer a smaller replacement. Saved dimensional rows and problem-solving formula references are now protected in the presentation paths.

## Behaviour

- The report is a collapsed View notes verification report section. Source reads start when it is opened.
- Its comparison checkbox only controls the report. It cannot delete, filter, rewrite or regenerate notes, formulas, PPT pages or the lecture plan.
- Existing formula sections are retained in slide notes, pagination and guided/lecture-plan views, regardless of source-review status.
- Generation continues using its existing dimensional-inference behaviour; only saved/display paths opt into preservation.
- Original stored lesson and source records are never overwritten by this fix.

## Verification

A read-only live-cache audit examined 121 accessible cached Physics lessons. 65 slides contained saved dimensional sections, with 336 saved rows in total. **0 rows/sections were missing after the corrected presentation helpers.** This verifies retention, not scientific correctness of every row.

Regression fixtures include all five formula categories shown in the report screenshot, their explanation/conditions, both note views, PPT pagination, original-array preservation and the report closed/open/toggle behaviour. The original generation files remain unchanged relative to the requested baseline.
