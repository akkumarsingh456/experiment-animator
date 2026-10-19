# Routes

[Application structure](../README.md) · [Beginner guide](../../docs/REPOSITORY_GUIDE.md)

## Existing EduPlan routes

| File | Address or role | Responsibility |
| --- | --- | --- |
| `index.tsx` | `/` | Homepage and class/subject/chapter selection. |
| `generate.tsx` | `/generate` | Lesson and presentation display; search parameters describe the selected lesson. |
| `notes-library.tsx` | `/notes-library` | Source library interface. |
| `history.tsx` | `/history` | Saved lesson history. |
| `upload.tsx` | `/upload` | Source upload interface with the existing access rules. |
| `auth.callback.tsx` | `/auth/callback` | Authentication callback handling. |
| `api.med-easy-pdf.ts` | `/api/med-easy-pdf` | PDF request handler, not an ordinary lesson page. |
| `__root.tsx` | Root layout | Shared document shell, layout, and error boundaries. |

Route filenames are functional: changing them can change the registered address
or framework behaviour. Preserve them during cosmetic organisation work.

## Framework conventions

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
is a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

The examples below illustrate the routing framework. They are not a list of
additional pages currently implemented in EduPlan.

| File | URL |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` (dynamic — bare `$`, no curly braces) |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment) |
| `files/$.tsx` | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx` | layout route (renders children via `<Outlet />`) |
| `__root.tsx` | app shell — wraps every page; preserve `<Outlet />` |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.
