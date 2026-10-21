# Online supplements for the flagged topics only

> Updated permission: the user's subsequent request explicitly authorises
> official-source recovery for other configured topics when NCERT recovery
> fails. `official-recovery-scope.ts` implements that separate failed-topic gate.
> The historical 401-topic list and successful-generation selection path are
> unchanged. See `audits/2026-10-21-official-recovery-fix.md` for current behaviour.

## Permission boundary

The 401 selections marked **Still needs attention** in the user's filtered
21 October 2026 report are frozen in `attention-topic-scope.json`.
Class, subject, chapter and topic must all match. Report updates do not expand
this permission. The other 1,391 selections keep their existing NCERT path.

An adequate topic is returned unchanged. An inadequate topic still tries the
existing uploaded-NCERT strategies and exact NCERT mirror before the new
supplement. Neither ordinary generation nor existing good cached slides are
replaced by online notes.

## Sources and student notes

The source registry binds each affected chapter to reviewed NCERT/SATHEE,
CBSE or CIET–NCERT documents. Mozilla's primary developer documentation supports
the Class 10 web topics. Lower-class prerequisite sources are explicitly
labelled; general documentation is not misrepresented as an NCERT textbook.
The existing Class 9 chapter list is retained.

Source URLs are fixed by the registry, with HTTPS, host, download-size and PDF
page limits. Google result snippets, arbitrary user URLs, advertisements,
logos and page images are not used as student notes.

Exact chapter documents can supply the existing source-extracted note format.
Class-wide handbooks require the explanation pass to avoid borrowing a
similarly named topic from another unit. That pass uses the existing Lovable
or Groq connection and the selected class's learning profile. Every displayed
point needs an actual matching source quotation and must pass notation and
source-support checks. Unsupported drafts stay unresolved. Source matching is
not a guarantee of factual correctness.

Student notes have no added publisher watermark or logo. Publication furniture
is excluded from the new notes; original PDF/image files are not altered.
Plain source links remain available for verification.

## Persistence and missing-library cases

Verified supplements are checkpointed in the existing lesson cache with a
separate versioned key containing the exact class, subject, chapter and topic.
Normal lesson cache keys are unchanged. Image saving, shared-image consent,
cropping and image position controls are untouched.

If no usable primary chapter exists, an online-only lesson is permitted only
when **every requested topic** is on the fixed allowlist. Other requested
topics must not be silently dropped or populated from online material.
Original teacher supplements and the existing MCQ builder remain available.
Verbatim chapter mode does not turn supplementary explanations into purported
original textbook text.

## Verification and rollout

The separate source-coverage report records 107 readable documents supporting
the 401 authorised selections: 246 pass direct source-extraction/rebuilt-note
checks; 155 still need the grounded explanation pass. Finding a source is not
recorded as a completed lesson.

This workspace has neither a Lovable nor Groq API key. The 155 explanation
passes therefore cannot be certified locally. Publish the code and regenerate
affected lessons using the website's configured AI connection. Successful
notes are cached; failed drafts are not saved as completed notes.
