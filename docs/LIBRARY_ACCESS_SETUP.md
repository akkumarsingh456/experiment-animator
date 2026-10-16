# Restricted library access setup

## Current migration workflow

The newer Google sign-in update introduced `drizzle.config.ts` and the `drizzle/migrations` journal. Its first migration adds basic profiles and the three source fields, but leaves every historical source unreviewed. The follow-up `0001_complete_source_library_access.sql` carries the remaining source-library security rules into that same active migration chain. Deploy the pending Drizzle migration through Lovable's linked database workflow. The Supabase-folder script below is the equivalent standalone recovery script; do not reset either database or profiles.

The live read-only check on 17 October 2026 found the three fields present, with 295 unreviewed records and no approved NCERT records. A live Current Electricity generation reached the approval check and reported that no approved textbook was available. This supersedes the screenshot's earlier missing-column state. Existing sources still require an authorised review before generation can use them. This check did not modify records or complete the Google account round trip.

## Deployment steps — required

1. Apply the pending `drizzle/migrations/0001_complete_source_library_access.sql` through the linked Lovable database migration workflow **before publishing this version**. The equivalent standalone script is `supabase/migrations/20261016010000_lock_source_library.sql`. This session has no database-management credentials and has not applied the security migration to the live database.
2. Preserve the newer managed Google OAuth helper and public `/auth/callback` route. Complete the interactive Google account-selection flow and verify its returned session. Do not replace this integration with a second provider or introduce manual OAuth secrets as part of this database repair.
3. Verify the configured production site URL and the exact `/auth/callback` return route used by managed Google sign-in. Email links currently return to `/upload`. Add actual preview return URLs only if needed; avoid broad production redirect wildcards.
4. Enable email authentication and configure an email-delivery provider if email-link sign-in is needed. Default hosted email delivery is restricted/rate limited; Google and email-provider availability must be checked in the actual account. No Clerk keys are required.
5. Confirm the deployed server has SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY. The service-role key must never use a VITE_ prefix, appear in a client bundle or be pasted into a chat.
6. Sign in as one of the two verified admin addresses. Open Upload status; open each existing NCERT PDF and use **Verify as NCERT** only after checking it. Existing records default to unreviewed, so notes fail closed until a matching NCERT source is approved. New uploads have an explicit NCERT confirmation checkbox; unchecked books are reference-only.
7. Publish. Check anonymous access, an ordinary signed-in account, both admins, expired sessions, direct server calls, and direct anonymous database/storage requests before describing the deployment as secured.

## Recover generation after a missing source_kind error

`column ncert_books.source_kind does not exist` means the app was published before the source-library database migration. It does not mean the textbook or generated notes were deleted. Re-uploading PDFs, changing subjects, and repeatedly retrying generation will not create the missing columns.

Apply the committed `20261016010000_lock_source_library.sql` through the linked project's migration workflow before publishing the matching application update. The script is transactional, can be rerun without duplicate constraint/policy failures, and reloads the PostgREST schema cache. Do not reset the database, delete books, revert recent UI changes, or remove the NCERT approval filter to work around this error. When using an SQL editor for emergency recovery, reconcile the migration history through the project's normal migration workflow afterwards.

Sign in with an approved admin account and open **Library access**. The page checks the required columns before loading or classifying the inventory and reports a setup problem instead of claiming the inventory is empty. Once ready, open and verify the existing official NCERT sources. Historical records remain unreviewed until explicitly approved; the migration does not automatically trust filenames or reference books. Then retry the originally selected chapter. Check both Class 11 Units and Measurement and Class 12 Current Electricity with matching approved, readable sources. Verify that a reference-only source is still excluded.

Local type checks and regression tests cannot confirm that a remote migration was applied. Record the actual migration outcome and a successful live lesson before describing the incident as resolved.

## Access rules

- Verified Auth email must exactly equal `akkumarsingh456@gmail.com` or `ak25edi00022@student.nitw.ac.in`. User-editable profile metadata and contact-form email fields never grant access.
- `/upload` and `/history` mount their inventory components only after server validation. Upload tickets, signing, insertion, scanning, captures, source approval and shared queue management independently require admin authentication on the server.
- Database reads of source books/pages/chunks are limited to these admins through RLS. Writes are server-only. Public lesson generation retrieves approved NCERT records through the server; it does not expose raw inventory queries to the browser.
- Notes use approved NCERT text only. Existing Med Easy diagrams and reader links remain separate visual references. Curated formula-reference pages are labelled supplementary, rather than claimed as copied NCERT content.
- Signed upload URLs use no upsert and existing recorded paths are rejected. No public operation replaces/deletes original PDFs. Admin OCR/indexing can still prepare pages; this is not a WORM archive or a promise of absolute security against a database owner/service-role-key holder.
- Admin download links expire in at most five minutes. New book records do not store a download URL. **Previously issued long-lived signed URLs may remain usable until expiry**; removing stored URLs does not revoke them. Review/rotate the storage signing keys through Supabase if revocation is required, understanding the effect on existing sessions/links. Already downloaded copies cannot be revoked.
- Signed-in nonadmins get an editable recommendation form. The mailto link opens a compose window in the device's configured email app; the site sends no email automatically. Name, email and message are encoded safely in the draft.

## References

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/reference/javascript/auth-signinwithotp
- https://supabase.com/docs/guides/database/postgres/row-level-security
