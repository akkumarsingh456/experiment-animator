# Shared interface controls

[Feature component index](../README.md) · [Application structure](../../README.md)

These controls are reused by the feature components. Their conventional names
and exports belong to the existing UI tooling, so this update documents them
without renaming or modifying their implementations. Follow the feature's
imports to see which control is actually used.

## Actions input and forms

| File | Purpose |
| --- | --- |
| [`button.tsx`](button.tsx) | Action button styles and component. |
| [`input.tsx`](input.tsx) | Single-line text input. |
| [`textarea.tsx`](textarea.tsx) | Multi-line text input. |
| [`input-otp.tsx`](input-otp.tsx) | Segmented one-time-password input control. |
| [`label.tsx`](label.tsx) | Labels for form controls. |
| [`form.tsx`](form.tsx) | Shared form field and message components. |
| [`checkbox.tsx`](checkbox.tsx) | Checkbox selection. |
| [`radio-group.tsx`](radio-group.tsx) | Selection of one option from a group. |
| [`select.tsx`](select.tsx) | Selectable option list. |
| [`switch.tsx`](switch.tsx) | Toggle between two states. |
| [`slider.tsx`](slider.tsx) | Selection along a numeric range. |
| [`toggle.tsx`](toggle.tsx) | A button with a selected/unselected state. |
| [`toggle-group.tsx`](toggle-group.tsx) | Grouped toggle controls. |
| [`calendar.tsx`](calendar.tsx) | Calendar/date selection presentation. |

## Menus and navigation

| File | Purpose |
| --- | --- |
| [`breadcrumb.tsx`](breadcrumb.tsx) | Hierarchical navigation trail. |
| [`navigation-menu.tsx`](navigation-menu.tsx) | Navigation menu components. |
| [`menubar.tsx`](menubar.tsx) | Menu bar and its associated controls. |
| [`dropdown-menu.tsx`](dropdown-menu.tsx) | Menu opened from a trigger. |
| [`context-menu.tsx`](context-menu.tsx) | Contextual menu controls. |
| [`command.tsx`](command.tsx) | Command/search selection interface primitives. |
| [`pagination.tsx`](pagination.tsx) | Page navigation controls. |
| [`tabs.tsx`](tabs.tsx) | Switchable tabbed sections. |
| [`sidebar.tsx`](sidebar.tsx) | Sidebar layout and controls. |

## Dialogs and temporary information

| File | Purpose |
| --- | --- |
| [`dialog.tsx`](dialog.tsx) | Modal dialog primitives. |
| [`alert-dialog.tsx`](alert-dialog.tsx) | Alert or confirmation dialog primitives. |
| [`drawer.tsx`](drawer.tsx) | Drawer-style panel. |
| [`sheet.tsx`](sheet.tsx) | Panel presented from an edge. |
| [`popover.tsx`](popover.tsx) | Floating content associated with a trigger. |
| [`hover-card.tsx`](hover-card.tsx) | Additional information associated with a hover/focus target. |
| [`tooltip.tsx`](tooltip.tsx) | Short contextual hints. |
| [`sonner.tsx`](sonner.tsx) | Shared toast notification presentation. |

## Layout display and feedback

| File | Purpose |
| --- | --- |
| [`accordion.tsx`](accordion.tsx) | Expandable grouped sections. |
| [`collapsible.tsx`](collapsible.tsx) | Expandable content primitive. |
| [`card.tsx`](card.tsx) | Card layout sections. |
| [`table.tsx`](table.tsx) | Table structure and styling components. |
| [`chart.tsx`](chart.tsx) | Shared chart presentation helpers. |
| [`carousel.tsx`](carousel.tsx) | Carousel display controls. |
| [`resizable.tsx`](resizable.tsx) | Resizable panel layout. |
| [`scroll-area.tsx`](scroll-area.tsx) | Styled scrollable area. |
| [`aspect-ratio.tsx`](aspect-ratio.tsx) | Maintains a content aspect ratio. |
| [`separator.tsx`](separator.tsx) | Visual separation of content. |
| [`avatar.tsx`](avatar.tsx) | Avatar image and fallback display. |
| [`badge.tsx`](badge.tsx) | Compact label presentation. |
| [`alert.tsx`](alert.tsx) | Alert message presentation. |
| [`progress.tsx`](progress.tsx) | Progress display. |
| [`skeleton.tsx`](skeleton.tsx) | Loading placeholder presentation. |

The existence of a control does not imply every page uses it. Preserve its
focus, keyboard, accessibility, and styling contracts when maintaining it.
