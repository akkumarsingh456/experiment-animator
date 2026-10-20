# Experiment animation presentation

The experiment player presents the existing activity data in an ordered timeline:
aim and apparatus, available precautions, every source procedure step, observation,
and conclusion. These sections do not rewrite the activity or generate new notes.

## Implementation

- `src/lib/experiment-timeline.ts` creates section timing and whole-word caption
  pages. Reading time includes both observation and conclusion.
- `src/lib/experiment-drawing.ts` renders the existing apparatus drawings at a
  configurable backing scale. Circuit switch states and the leaf water-bath
  scene follow the corresponding procedure actions.
- `src/lib/experiment-photographs.ts` composes the local drawing, section label,
  timed captions, and progress bar into a 1920 × 1080 frame. It retains its
  existing export name for compatibility.
- `src/components/ExperimentLab.tsx` exposes the complete timeline and readable
  current-section text, with existing pause, speed, seek, presentation, and
  optional browser read-aloud controls.

The schematic player no longer waits for apparatus photos that it does not
display. Existing photo utilities remain available to other consumers.

## Video export

Browser recording requests 30 frames per second and an 8 Mbps video bitrate,
using a supported WebM codec. Actual encoding depends on the browser and device.
The final frame is drawn before the recorder is stopped. Complete playback
downloads as `complete-animation.webm`; deliberate early stopping is labelled
`partial-clip.webm` instead of implying a complete experiment.

Captions are embedded in the video pixels. Browser speech synthesis is optional
during playback and is not part of the saved audio track. Unsupported recording
browsers retain the playback and instructional text.

## Scope and verification

Representative Ohm's-law, chemical-test, and photosynthesis scenes were rendered
as Full HD frames and visually inspected. TypeScript checking and production
compilation cover the changed modules. No lesson-generation prompts, model
versions, source procedures, library permissions, or external video catalogue
entries were changed. Live browser MediaRecorder and audio-device behaviour
require checking in the deployed browser; the rendered previews alone do not
certify recording on every device.

These remain instructional schematics. No invented meter readings, laboratory
measurements, timings for physical reactions, or universal scientific verification
are implied by smoother drawing or a higher recording resolution.
