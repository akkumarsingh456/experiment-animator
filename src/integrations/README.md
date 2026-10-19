# Authentication and database integrations

[Application structure](../README.md) · [Library setup](../../docs/LIBRARY_ACCESS_SETUP.md)

These clients connect application code to external authentication and database
services. Their package names, environment-variable names, and generated paths
are compatibility boundaries. Do not rename them to change their appearance.

| File | Responsibility |
| --- | --- |
| [`lovable/index.ts`](lovable/index.ts) | Generated adapter for the existing OAuth sign-in flow and session handoff. |
| [`supabase/client.ts`](supabase/client.ts) | Supabase client used by browser-facing code. |
| [`supabase/client.server.ts`](supabase/client.server.ts) | Server database client; inspect server access checks before using privileged operations. |
| [`supabase/auth-attacher.ts`](supabase/auth-attacher.ts) | Attaches authentication context to framework function requests. |
| [`supabase/auth-middleware.ts`](supabase/auth-middleware.ts) | Authentication middleware helpers. |
| [`supabase/previewAuthStorage.ts`](supabase/previewAuthStorage.ts) | Authentication storage support for preview contexts. |
| [`supabase/types.ts`](supabase/types.ts) | Database types used by the clients and server functions. |

For access decisions, also read `lib/library-access.server.ts` and
`lib/library-auth.ts`. Signing in and being authorised for an administrator
operation are different conditions. Existing public reading and lesson access
must not be changed by a documentation cleanup. Never copy credential values
into these guides.
