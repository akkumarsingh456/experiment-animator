# Experiment apparatus visuals

- `ExperimentApparatusPhotos.tsx` displays local photographs matched to the activity apparatus list, with original author, source and licence links. Photos are reference examples; laboratory models and scales can differ.
- `experiment-photographs.ts` owns the photo inventory matching and the full-video compositor. Photograph loading never blocks playback.
- `experiment-circuit-visual.ts` draws the Ohm's law bench apparatus.
- `experiment-bench-visual.ts` draws microscopy, bar-magnet/coil, optical-bench and pendulum apparatus.
- `experiment-drawing.ts` retains source-dependent chemistry and leaf stages and dispatches the supported apparatus views.
- `experiment-preview.ts` crops the apparatus stage for readable procedure cards.

All activities receive the reference-photo section. Only inventory matches produce photos. Unsupported setups explicitly request the source manual rather than claim to have an exact animation. The drawings illustrate apparatus and actions, not measured data; original procedure text, observation and conclusion remain unchanged. No full scientific audit of every uploaded experiment or live recording compatibility is implied.
