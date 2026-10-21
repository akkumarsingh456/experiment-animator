# Book requests: missing storage repair

## Confirmed cause

On 21 October 2026 a read-only schema probe of the connected project's REST API returned HTTP 404 / `PGRST205`: `public.book_requests` was absent from the schema cache. No user messages, email inboxes or private request records were read by that probe. The admin error is a storage-setup failure, not filtering by the requester's Gmail account.

The submission code stores a request only after verified sign-in and returns a receipt only after the database confirms the inserted row. The administrator list has no requester-specific filter and is protected by existing administrator middleware.

The probe confirms that the API cannot find this table; without management access it cannot distinguish an absent table from a stale schema cache. The repair covers both cases by creating the table only if missing and refreshing the API schema. See the [PostgREST error reference](https://docs.postgrest.org/en/v16/references/errors.html) and [Supabase schema-cache guidance](https://supabase.com/docs/guides/troubleshooting/postgrest-not-recognizing-new-columns-or-functions-bd75f5).

## Apply the repair in the connected Lovable database

The ordered repair is `drizzle/migrations/0004_repair_private_book_requests.sql`, registered in the migration journal. Apply pending migrations through the linked Lovable database workflow. Publishing frontend/server code by itself does not apply database DDL.

If using a database SQL editor instead, run the equivalent standalone recovery script `supabase/migrations/20261021040000_repair_private_book_requests.sql` against the same database connected to this website. Reconcile migration history with the normal migration workflow; do not independently run both copies as separate tracked migrations.

The script uses `CREATE TABLE/INDEX IF NOT EXISTS`, retains the existing schema, does not delete or truncate data, enables RLS, revokes public/client access, permits only the service role, and reloads the REST schema cache. Source books, notes, profiles and source storage are untouched.

This local session has public connection configuration but no service-role key, database connection URL or migration-management connection. The live schema repair cannot be applied from those public credentials. Do not paste database secrets into chat; use the linked database workflow or connected SQL editor.

## Verify after application

1. Refresh Book requests while signed in as the authorised administrator. The table should load rather than return a migration error.
2. Submit a book request from each test account, retaining each saved receipt.
3. Confirm both records appear in the administrator's newest page with their verified account addresses, titles and messages.
4. Mark one reviewed, refresh and confirm that the status remains saved.

Submissions attempted while the table was missing could not be stored. If a user did not receive a saved receipt, resubmit after repair. Opening or sending an email draft does not insert a website request; this feature does not import Gmail messages.

## Code verification

Five focused mocked tests cover two verified account submissions, combined admin listing and admin middleware, honest failure without a saved receipt, error categories, and the non-destructive/private repair script. These do not substitute for applying the migration and verifying the live website. Live repair is pending until database access is available or the administrator applies it.
