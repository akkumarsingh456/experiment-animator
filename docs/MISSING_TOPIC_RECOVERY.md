# Missing-topic recovery panel

A failed topic now remains in the lesson with `topic_recovery.status=missing`. Other topics continue through the existing NCERT recovery and verification pathway. This also applies if the final source check leaves a topic incomplete. The lesson does not claim that the missing topic is complete.

Only marked topics receive the bottom Teacher notes / Google search panel. Its popup offers a class/subject/chapter/topic query, official text results with point-wise previews, and a teacher writing area. Google opens in a separate tab; Google search-result snippets are not imported as lesson evidence. Automatic extraction accepts only supported official URLs bound to that class and chapter, including the matching SATHEE chapter mirror. Unsupported search pages can be reviewed by a teacher and entered as teacher notes.

Draft text remains in device storage. Permanent shared notes use the existing administrator identity check and the existing lesson_cache table, with a separate namespace and an exact canonical class/subject/chapter/topic key. A confirmed read-back is required before showing Saved. No new database migration is required. Edited text is labelled Teacher notes, not automatically verified NCERT text. Unedited official extraction is rechecked against the matching source at save time.

Saved notes are loaded for the affected topic on refresh and regeneration. Complete NCERT topics retain the existing generation behaviour. Source-less fallback lessons also load saved notes per failed topic. Missing-topic and teacher-note text does not supply cached MCQ statements. Permanent saving needs the deployed server's existing Supabase service configuration and an administrator sign-in.

No image editor, image save/share permission, crop, import, navigation, model choice, prompt or good-topic extraction setting was edited. The route applies only sections and recovery metadata after a save, preserving concurrent image updates.

Validation: focused recovery and save checks cover continuation, exact scope, retained good topics/image metadata, administrator permissions, wrong-class/chapter source rejection and failed storage. Local checks do not establish that the currently published Lovable site has this change or that its database is writable.

Presentation access fix: the affected topic now renders its recovery control inside the presentation shell, above the navigation footer. It is available in inline and full-screen slide views as well as guided presentations. The popup stays inside the native browser fullscreen element and deck navigation ignores its keyboard events. Controls remain absent from unaffected topics and exports.

Text preview improvement: opening the affected-topic popup now loads official source previews automatically. If the first checked source is incomplete, this picker also reads the matching official chapter mirror. Readable partial passages are displayed with a partial warning and import as teacher notes. Complete source passages retain their source checks. Source formulas use the existing MathText renderer; importing does not modify the source wording. Google remains an external search option, not an embedded search-results feed.

Passage selection: previews now default to readable paragraphs, with a Points view. Teachers can tick individual passages and import the selected original text, or keep the existing whole-passage import. A subset is labelled Teacher notes for review; it is not treated as a complete checked extraction. This changes the recovery popup presentation only.
