# Public learning and restricted uploads

## Current access rules

The owner clarified on 17 October 2026 that authentication is for adding new books and notes, not for using existing materials. Lesson preparation, saved notes, PPT/PDF views, the Notes Library, queue controls, the uploaded-book catalogue and opening recorded PDFs are public. Existing source records must not require retrospective NCERT approval or sign-in.

New source uploads and source-data writes remain restricted to verified administrators: akkumarsingh456@gmail.com and ak25edi00022@student.nitw.ac.in. The server checks the verified Auth identity, never a client-supplied role, profile name or editable contact email. Upload tickets, book/page/chunk insertion, OCR ingestion and source captures retain their server-side administrator checks. Existing recorded originals cannot be overwritten through a new upload ticket.

The homepage Admin login button opens `/upload`, which retains its sign-in gate. Choosing the verified Google account akkumarsingh456@gmail.com automatically opens the existing book and notes PDF upload tools; no manual profile role is needed. Email sign-in links use the same server-verified allowlist. An administrator banner confirms when uploads are enabled. `/history` is a public, read-only uploaded-books catalogue. Public download signing requires the exact storage path to belong to a recorded library book, rejects invalid paths, and issues a short-lived URL. It cannot sign arbitrary private storage files. Source storage remains private; public reading uses the controlled book reader rather than public upload permissions.

## Restored generation

The lesson reader accepts historical textbook records even when `source_kind` is absent or `unreviewed`. That field describes a source classification, not whether a visitor is allowed to learn. Known reference books and records explicitly classified as reference remain excluded from primary NCERT note text; their figures and reader links remain available separately. Class, subject and chapter scoping, scientific notation guards, curated formula additions, notes pagination and PPT layouts are retained.

The reader supports databases without the optional classification field. Only a missing classification-column error causes a compatibility retry; actual permission and connectivity errors are reported. There is no fallback to books from a different class or subject and no automatic relabelling of the owner's library.

The earlier source-approval prerequisite was the misunderstanding behind the outage. It is removed. Restoring generation does not require approving all 295 historical records, uploading those PDFs again, resetting the database or reverting the owner's design and lesson changes.

## Database migration alignment

The active migration journal is under `drizzle/migrations`. The follow-up `0002_public_library_reading_admin_uploads.sql` supersedes the read restrictions introduced in `0001_complete_source_library_access.sql`. Apply pending migrations in journal order through the linked Lovable database workflow. The equivalent standalone recovery file is `supabase/migrations/20261017020000_public_library_reading_admin_uploads.sql`; reconcile migration history if an SQL editor is used outside the normal workflow.

The current migration grants SELECT on book, page and chunk tables to anonymous and authenticated readers. Client insert, update and delete privileges remain revoked, and trusted server operations retain their access. No source records, saved notes, files or profiles are deleted or reclassified. Even where older restrictive read policies remain, the public catalogue and generation handlers perform the permitted read on the server, so public learning does not depend on the visitor having a database session.

Do not reset either database or profiles. Do not make the storage bucket publicly writable. Do not expose a service-role key or prefix it with VITE_. Server functions require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; identity verification also uses SUPABASE_PUBLISHABLE_KEY.

## Google sign-in and contact flow

Preserve the owner's managed Google OAuth helper and public `/auth/callback` route. Profiles remain owner-scoped and never grant administrator access. Complete the interactive account-selection flow to verify Google sign-in; do not introduce a second provider or manual client secrets as part of this public-reading repair. Email sign-in links are an alternative where delivery is configured.

People without upload permission can still read books and generate lessons. If they choose to sign in to suggest a new book, the upload page offers an editable message addressed to akkumarsingh456@gmail.com. It opens their configured email composer and never sends automatically.

## Verification

Check generation while signed out for Class 10 Metals and Non-metals, Class 11 Units and Measurement and Class 12 Current Electricity. Confirm a meaningful result sourced from the matching saved textbook, and confirm the existing notes, formula references and PPT views remain available. Open `/history` without a session, browse the catalogue and open a saved PDF. Confirm the Notes Library and its existing generated lessons do not require sign-in.

Separately confirm that an anonymous visitor and a nonadmin cannot obtain an upload ticket or insert source records, while a verified authorised administrator can add a new source. Test missing and unreviewed classification fields, known reference-book exclusion, invalid download paths and nonexistent storage objects. Record any missing source text or remote deployment limitation separately from authentication.

## References

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/deployment/database-migrations

## Administrator dashboard and book requests

After verified administrator sign-in, `/upload` offers Upload books & notes and Book requests. Switching sections keeps the upload component mounted so a current upload is not discarded. The requests section lists website submissions newest first, 25 per page, with name, verified sign-in email, message, submission time and New/Reviewed status. It refreshes while open every 30 seconds and offers manual refresh. Only the existing server-verified administrators can list or review requests.

Apply `drizzle/migrations/0003_private_book_requests.sql` through the linked database migration workflow before using requests. The equivalent standalone Supabase migration is `20261017030000_private_book_requests.sql`; do not execute both independently without reconciling migration history. This adds a separate private `book_requests` table with RLS and no anonymous or authenticated client privileges. Existing book tables, storage, notes, profiles and email integrations are unchanged. Service role access stays server-side. The local workspace cannot apply the linked database migration without database management access.

If the requests table is missing or the REST API returns `PGRST205`, the additive recovery migration `0004_repair_private_book_requests.sql` is now registered. See [BOOK_REQUEST_RECOVERY.md](BOOK_REQUEST_RECOVERY.md). Applying the database migration is required; publishing code alone cannot create the table.

Verified signed-in visitors can use Submit book request on their existing suggestions form. The server derives user ID and email from verified Auth, validates name/message lengths, and limits submissions to ten per account in a rolling 24-hour window. This application-level count is a basic abuse guard, not an atomic quota under concurrent requests. Names and messages render as text, never HTML. The contact-email field remains editable for the mailto draft only. No upload permission is granted by submitting a request or by changing a profile/contact field.

The existing email draft link is preserved. Submitting a website request sends no email, and opening an email draft does not silently create a website request. Historical emails and previously opened drafts cannot appear in the dashboard: the feature never reads, imports, sends, edits or deletes mail. Missing-table errors are shown explicitly, never as a misleading empty inbox. Publish the app after applying its migration, then complete account-based verification for an administrator and a separate visitor.

## Request title and refresh correction

The request form now requires a book title. To preserve compatibility with existing `book_requests` tables without another migration, store it as an explicit `Book title: ...` line before the unchanged user message; derive the dashboard title from that labelled line. Never guess a book title from an unlabelled paragraph or the original template. Earlier records without an explicit title are labelled as missing a title and keep their full original message. The server still accepts legacy callers without the new optional field so previously published forms remain compatible.

Submission now obtains the inserted record ID and timestamp before displaying a success receipt. A failed insert never displays success. The form invalidates request queries and emits a non-sensitive same-browser storage notification; no name, email or message is placed in localStorage. Administrator polling runs every ten seconds while visible, refreshes on mount/window focus/reconnection and offers Refresh newest, which resets pagination to the first page. A visible last-checked time distinguishes successful checks from loading/failure. Existing email drafts remain separate; opening mailto does not create a dashboard record. The original private requests table migration still has to be applied, but this correction needs no additional database columns.
