# Fix the lesson view and unfinished subtopic update

## Changes
- Repair the malformed expanded-subtopics entry causing the build failure.
- Merge the new NCERT-aligned subtopics into each matching chapter selection without duplicates.
- Resize the lesson canvas to fit completely within the visible screen, including controls, while preserving A4 landscape proportions.
- Keep Teacher Notes paginated inside the page with formulas and derivations kept together; remove internal page scrolling.
- Verify the normal lesson view and presentation view at desktop and mobile sizes, then confirm the Notes Library still opens.

## Technical details
- Reuse the existing syllabus helpers and `PagedNoteSections`; do not change the locked notes-generation pipeline.
- Use container-based aspect-ratio sizing rather than viewport-width formulas that can overflow short screens.
- Correct only the presentation layout and unfinished syllabus wiring.
