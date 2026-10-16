# EduPlan preservation snapshot — 17 October 2026

Website source, migrations, configuration templates, local illustrations and the normal dependency lockfile are versioned in the main Git repository. Commit history preserves earlier revisions. This is a backup record, not a change to application behaviour.

`2026-10-17-local-drafts.zip` preserves 30 previously untracked preview sources, supporting local assets and Aman Kumar’s Week 4 Word deliverable. The accompanying manifest lists each file’s SHA-256 digest. Drafts stay inside the archive and are not imported into the production application. The existing `bun.lock` remains the application lockfile; any local package-lock is preserved separately in the private workspace backup.

A separate local private backup is stored under `work/backups/EduPlan_<timestamp>` beside the project checkout. It includes working files, outputs, local PDFs, a file manifest and a Git history bundle, excluding reproducible dependencies and build caches. It can include local secret configuration: do not upload it to a public repository. Keep another private copy on independent storage for protection against loss of this computer.

GitHub does not automatically back up the live database, authentication accounts, cloud PDF storage, browser-local edits, server secrets or live provider configuration. Publicly accessible database rows can be exported separately; that does not bypass row policies or constitute a full owner database backup. A full recovery requires an authorised export of database tables, stored PDF/image objects, authentication configuration and server settings. Preserve secrets through private secret storage, not Git.

To restore the code, clone this repository or clone the local Git bundle, then use the committed lockfile and documented deployment environment settings. Restore local drafts from the archive only as needed. Restore cloud data and files through the backend provider before directing the application to a replacement backend. Configure Google OAuth redirect URLs for the chosen host, apply pending migrations and verify public learning and restricted uploads. Do not overwrite the existing source library while restoring a copy.

No storage service or Git repository guarantees permanent retention. Maintain independent backups and verify restores periodically.
