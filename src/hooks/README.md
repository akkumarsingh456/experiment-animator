# Reusable React hooks

[Application structure](../README.md)

[`use-mobile.tsx`](use-mobile.tsx) exports `useIsMobile`. It listens for browser
width changes and reports whether the viewport is below the existing 768-pixel
breakpoint. Components can use that result to adapt their interface.

A hook provides reusable React behaviour; it is not a page or a lesson-generation
service. Follow the function's imports and callers to understand where its state
affects the display. Other feature-specific hooks also exist in their respective
helper modules; see the [helper index](../lib/README.md).
