# Visual and simulation configuration

[Application structure](../README.md) · [Component index](../components/README.md)

| File | What it configures | What it does not configure |
| --- | --- | --- |
| [`models.ts`](models.ts) | Maps 3D model categories to Spline scene URLs through `ModelRegistry` and `resolveModelUrl`. | These are visual 3D scenes, not text-generation model versions. |
| [`simulations.ts`](simulations.ts) | Lists simulation titles, providers, URLs, subject tags, and matching keywords. | A catalogue entry is not a guarantee that an external provider currently permits embedding. |

Follow the consumers in `ThreeDViewer.tsx` and `SimulationViewer.tsx` to see how
these settings appear in a lesson. Preserve the existing fallback links and
category values when maintaining either catalogue. This documentation adds no
new providers and changes no configuration values.
