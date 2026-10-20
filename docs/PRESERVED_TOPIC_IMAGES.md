# Preserved 2D topic images

Only manual image handling changes. Lesson generation, source text, note content, formula processing and automatic illustration rendering remain unchanged.

## Reader flow

1. Import or paste an image in the 2D panel.
2. Choose Crop, move the selection and resize using the blue corner or sliders, then apply.
3. Choose Preserve / save. Confirm the displayed class, subject, chapter, topic and slide.
4. Check Yes, preserve for everyone, then Save for everyone. Without that confirmation, Save on this device retains the previous private/device behaviour.
5. A matching shared image is loaded automatically for readers without a personal override, including after refresh or on another device. Use preserved image explicitly replaces the current personal preview. Restoring the automatic diagram does not delete the shared contribution.

## Scope and storage

- `shared-topic-visual.ts`: exact normalized metadata key, including original slide index. No fuzzy matching or cross-chapter fallback. A changed slide index is intentionally a different slot.
- `shared-topic-visual.functions.ts`: bounded raster validation and server-only persistence in the private `shared-topic-visuals` Supabase storage bucket. The bucket is created on the first successful contribution. No lesson/source database schema migration or source bucket modification.
- A SHA-256 scope path stores one current image, crop raster, layout, credit and save timestamp. A confirmed replacement updates only that exact slot. No expiring image URL is stored.
- Public server functions support the requested public reading and explicit sharing; storage credentials stay server-side. Raster types and payload/layout sizes are validated. Source book upload and administrative access controls are unchanged.
- Failed cloud saves report failure and keep the edit available; they never report a device-only save as successful sharing. Existing personal images and in-progress edits are retained when shared data loads asynchronously.
- Cropping retains supplied source credits. Relevance is confirmed by the contributor; no automatic factual or copyright verification is claimed.

Deployment needs the existing server Supabase service credentials and storage permission to create/write the dedicated bucket. Type/build checks do not establish live persistence across two devices; verify that flow after publishing.
