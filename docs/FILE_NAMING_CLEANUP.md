# Utility filename cleanup

## Scope

| Previous path | Descriptive path | Responsibility |
| --- | --- | --- |
| `src/lib/ai-gateway-json.ts` | `src/lib/structured-response-client.ts` | Requests structured formula and derivation responses from the existing model gateway |
| `src/lib/lovable-error-reporting.ts` | `src/lib/browser-error-reporting.ts` | Forwards browser exceptions to the existing hosting error collector |

Both utility files retain their original contents and exports. The consumers in
`formula-notation.ts`, `ncert-teacher-notes.ts`, `__root.tsx`, and the existing
formula augmentation test change only the import or mock module paths.

`README.md` provides a source map for maintainers. Two additional test files
check the gateway contract, fallback behaviour, and browser collector contract
without calling external services.

## Compatibility checks

- Baseline: 2,789 passing tests; three opt-in live tests skipped.
- After renaming: 2,794 passing tests; the same three live tests skipped.
- A second full run after the production build also passed all 2,794 tests.
- TypeScript checking and the production build passed before and after.
- The two moved files have identical byte contents before and after renaming.
- Reversing only the import-path substitutions reproduces the original consumer
  files, after normalising existing Git line endings.
- All 39 production browser JavaScript and CSS assets have identical filenames,
  SHA-256 hashes, and byte sizes before and after: 3,802,789 bytes in total.
- Built-worker requests return HTML with status 200 for `/`, `/notes-library`,
  `/history`, `/upload`, and `/auth/callback`. An incomplete `/generate` request
  retains its expected normalising redirect. A PDF request without required
  parameters returns the expected status 400.
- Following the normalising lesson redirect returns status 200 and lesson-view
  HTML without starting generation.

The generic Vite preview command expects a different server output directory;
that baseline preview mismatch was bypassed by testing the actual built
Cloudflare worker entry. No hosting configuration was changed.

## Preserved interfaces and limits

Routes, authentication behaviour, generation prompts and models, service URLs,
environment-variable names, database schema, package identifiers, and generated
integration files are unchanged. Lovable integration names describe real
dependencies and are retained. Historical dates and commit history are untouched.

These checks cover automated regressions, production compilation, byte equality,
and route responses. They do not certify every live account, external service,
or production network condition. No paid generation or external authentication
session was started for this filename cleanup. Publication remains a separate
deployment step.
