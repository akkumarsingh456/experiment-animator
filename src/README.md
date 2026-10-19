# Application structure

[Project start](../README.md) · [Beginner guide](../docs/REPOSITORY_GUIDE.md) ·
[Feature reading paths](../docs/FEATURE_READING_PATHS.md)

## Reading order

1. Find the page in [`routes/`](routes/README.md).
2. Find the interface pieces it renders in [`components/`](components/README.md).
3. Follow imported processing functions into [`lib/`](lib/README.md).
4. Read the matching [tests](../tests/README.md).
5. Consult [`integrations/`](integrations/README.md) only when the feature reaches
   a database, authentication boundary, or external client.

## Application entry points

| File | Responsibility |
| --- | --- |
| [`router.tsx`](router.tsx) | Creates the TanStack router and its query-client context. |
| [`routeTree.gen.ts`](routeTree.gen.ts) | Generated route registration. Read to understand the route tree; do not hand-edit. |
| [`routes/__root.tsx`](routes/__root.tsx) | Shared document shell, application layout, and error presentation. |
| [`start.ts`](start.ts) | Framework startup middleware for request errors and function authentication context. |
| [`server.ts`](server.ts) | Server entry wrapper and fallback handling for server-rendering failures. |
| [`styles.css`](styles.css) | Shared visual styles for the application and lesson layouts. |

## How the layers cooperate

```text
Page in routes/
    -> interface components
    -> processing or rendering helpers in lib/
    -> server functions and integrations when required
    -> displayed result or export
```

This is a reading map, not a claim that every action calls every layer. Local
diagram rendering, for example, can use existing slide data without a network
request. A database action and a local display correction have different
responsibilities and permissions.

## Other directories

- [`config/`](config/README.md): 3D scene and simulation registries.
- [`hooks/`](hooks/README.md): reusable React state and browser behaviour.
- [`components/ui/`](components/README.md#shared-ui-primitives): reusable controls
  used by the feature components.

Keep server-only credentials out of browser modules. Preserve the exact names
required by frameworks and external integrations. See the [repository
guide](../docs/REPOSITORY_GUIDE.md#safe-reading-and-editing-boundaries) before
renaming or moving any application file.
