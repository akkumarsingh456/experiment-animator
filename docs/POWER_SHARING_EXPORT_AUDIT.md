# Power-sharing export and Classes 9–12 generation audit

Date: 18 October 2026. Scope: the 294 selections configured in `NCERT_SYLLABUS`, not every possible NCERT subject or edition.

## Findings in the supplied export

The supplied 62-page Power-sharing slide PDF was inspected as rendered pages. Original teacher-PDF pages appeared as filenames with missing pictures; generic side diagrams occupied source-page slides. Other issues included edition/page furniture in notes and quiz questions, arbitrary word blanks and placeholder choices, answer-key fragments presented as standalone revision slides, and author attribution inconsistent with the uploaded text.

## Changes

- Automatic book-picture refresh is additive and preserves already-rendered teacher PDF pages and existing image URLs.
- Original teacher pages use a dedicated full-page view in both presentation and guided notes. Export rejects a teacher-page slide whose image has not loaded.
- Cleaning preserves historical years, date ranges and chapter references; identifiable print furniture is removed separately. Original PDF rasters are not rewritten.
- Quizzes use complete source definitions and distinct source-derived alternatives. No random word blanks, invented placeholder choices or fixed-count padding. A chapter may have fewer questions or none.
- Topic selection preserves commas inside parentheses; question headings and plural topic words match their source forms.
- Science subject suffixes and the Systems/System of Particles title variation no longer break chapter matching. Missing chapter evidence stops generation instead of using broad keyword retrieval.
- Flattened English PDFs use explicit contents entries and a consistent printed-page offset. Legacy chapters and writing sections absent from the dropdown still stop the selected reading.
- Hindi/Sanskrit volume names are matched explicitly; Antara and Antaral are distinct. Duplicate source volumes are not concatenated.
- Teacher-note attribution follows explicit PDF evidence. Answer-key-only extracted fragments are skipped; their original PDF pages remain included.
- Complete scoped source text is retained instead of silently cutting at 160,000 characters.
- Source metadata identifies the chosen source, and suggested activity excerpts must occur in its scoped chapter context.
- Additional labelled chapter schematics cover previously missing science title variants; they are not described as original textbook figures.

## Method and practical limits

The actual local `generateLesson` handler was invoked for each configured selection, using the catalog subtopics, validated inputs, no production lesson-cache hits and blocked database writes. Public library metadata/chunk reads were used; Social Science page text came from the existing local source snapshot. Affected English/language selections and focused Physics/Chemistry cases were rerun after fixes. Source image signing was read-only and could fail under public permissions; a returned lesson is not proof that private images load in the published app.

This is a generation and extraction audit, not a factual certification of every sentence, diagram or uploaded PDF. Paid AI passes, deployed browser downloads and authenticated private-source rendering were not end-to-end verified. Three mock-based PDF rendering/layout tests verify preservation and error handling, not live storage access.

## Results

| Class | Configured | Returned a lesson | Stopped for missing/unmatched source |
| --- | ---: | ---: | ---: |
| 9 | 82 | 77 | 5 |
| 10 | 84 | 80 | 4 |
| 11 | 63 | 58 | 5 |
| 12 | 65 | 61 | 4 |
| **Total** | **294** | **276** | **18** |

**Returned does not mean complete or fact-checked.** Seven Social Science selections use original teacher-PDF pages without readable core textbook text. Thirteen returned selections have at least one explicit topic-evidence gap. The previous 160,000-character cutoff was removed; all nine affected selections were rerun with their complete scoped source input. These categories can overlap.

### Blocked selections

Sixteen Computer Science selections have no matching readable chapter under the configured title; source/catalog alignment or reprocessing is still needed. The library did not provide matching Class 9 Shemushi Part 1 or Class 12 Aaroh Part 2 volumes. Do not substitute another book to make these look successful.

| Class | Subject | Selection |
| --- | --- | --- |
| 9 | Computer Science | Chapter 1: Computer System Overview |
| 9 | Computer Science | Chapter 2: Data Representation and Basic Software |
| 9 | Computer Science | Chapter 3: Office Productivity Tools (Word Processing, Spreadsheets, Presentations) |
| 9 | Computer Science | Chapter 4: Cyber Safety and Security |
| 9 | Sanskrit | शेमुषी भाग 1 (पाठ 1–12) |
| 10 | Computer Science | Chapter 1: Internet Basics and Web Services |
| 10 | Computer Science | Chapter 2: HTML Fundamentals & Cascading Style Sheets (CSS) |
| 10 | Computer Science | Chapter 3: Cyber Ethics and Security |
| 10 | Computer Science | Chapter 4: Database Concepts (MySQL Basics) |
| 11 | Computer Science | Chapter 1: Computer Systems and Organization |
| 11 | Computer Science | Chapter 2: Encoding Schemes and Number Systems |
| 11 | Computer Science | Chapter 4: Control Statements |
| 11 | Computer Science | Chapter 6: Strings and Lists |
| 11 | Computer Science | Chapter 8: Societal Impacts |
| 12 | Computer Science | Chapter 1: Python Revision Tour |
| 12 | Computer Science | Chapter 4: Data Structures (Stack & Queue) |
| 12 | Computer Science | Chapter 6: Database Management System (SQL) |
| 12 | Hindi | आरोह भाग 2 |

### Returned lessons with topic gaps

| Class | Chapter | Unavailable topic evidence |
| --- | --- | --- |
| 9 | Chapter 5: Introduction to Euclid's Geometry | Euclid's method |
| 9 | Chapter 1: Matter in Our Surroundings (Chemistry) | Physical nature of matter |
| 9 | Chapter 7: Motion (Physics) | Description of motion |
| 9 | Chapter 4: Food Security in India (Economics) | accessibility and affordability |
| 10 | Chapter 13: Our Environment (Biology) | Ozone layer depletion |
| 10 | Chapter 1: Chemical Reactions and Equations (Chemistry) | Corrosion; Rancidity |
| 10 | Chapter 2: Acids, Bases and Salts (Chemistry) | pH scale |
| 10 | Chapter 3: Metals and Non-metals (Chemistry) | Physical and chemical properties |
| 11 | Chapter 7: Tuples and Dictionaries | Tuple immutability |
| 11 | Chapter 1: Sets | Types of sets |
| 12 | Chapter 6: Haloalkanes and Haloarenes | Nature of C-X bond |
| 12 | Chapter 3: File Handling | CSV files |
| 12 | Chapter 2: Inverse Trigonometric Functions | Properties |

### Long source input recheck

All nine previously capped inputs returned a lesson after the character cutoff was removed. The largest rechecked scoped input was 409,636 characters. This confirms the builder accepts the full scoped input; it does not certify that the source extraction or every topic is complete.

## Engineering verification

- Full automated suite: 717 tests across 51 files passed.
- TypeScript check: passed.
- Production build: passed.
- Existing tests were updated for already-intended grouped headings, explicit unavailable-topic messages, and administrative upload middleware mocks. Production authorization was not relaxed.
- Detailed generation outcomes, including every configured selection, are saved in [the audit data](audits/2026-10-18-chapter-generation-results.json).

## Release and follow-up

Git changes must be published through the project’s Lovable publishing flow before they appear at the public URL. Regenerate Power-sharing after publication to replace previously cached/generated damaged content. Old downloaded PDFs cannot be repaired by changing the website. Live private-source image rendering and a fresh PDF/PPTX download still need verification on the published app. Resolve the source/catalog gaps, the explicit topic gaps before claiming complete coverage.
