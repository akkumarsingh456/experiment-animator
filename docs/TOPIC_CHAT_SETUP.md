# Gemini topic chat setup

The topic notes popup uses Gemini only. Teachers click Send, review the reply, then Insert notes. No additional provider key is required.

## Owner setup

1. Keep GEMINI_API_KEY in this project's Lovable Settings > Secrets. Never paste its value into chat, GitHub, browser code or a VITE_ variable.
2. Deploy supabase/functions/gemini-topic-chat/index.ts with supabase/config.toml. Cloud secrets are read by this backend using Deno.env. The website server uses its managed SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to call it. The function checks the server credential and rejects anonymous calls.
3. Publish/update the website and verify Send, a real Gemini reply, then Insert notes. Frontend publishing alone does not deploy a new backend function. A build does not verify the live AI connection.

Copyable Lovable request:

> Deploy the gemini-topic-chat backend function from the synced repository using the existing GEMINI_API_KEY and supabase/config.toml. Preserve its server-credential authentication. Ensure the website server has its managed SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY connection. Verify a Gemini topic reply, then publish. Never expose secrets to the browser.

## Connection and limitations

If the website server already has a direct GEMINI_API_KEY, it uses Gemini directly. Otherwise it uses the protected backend bridge. Cloud Secrets do not necessarily populate the website SSR process.env runtime. Backend deployment, missing credentials and quota problems have separate safe error messages.

Default model: gemini-3.1-flash-lite. Optional GEMINI_TOPIC_CHAT_MODEL selects another account-supported model. Free-tier eligibility and quotas depend on Google; unlimited replies are not promised.

The explicit Add notes chat answers from Gemini subject knowledge without requiring an extracted passage. Its replies are labelled AI drafts for teacher review, not verified NCERT extracts. Legacy source-grounded recovery retains source-evidence checks. On connection failure, matching textbook excerpts may be shown with an explicit source label. Existing notes are preserved. Other generation/PYQ provider configuration is unchanged.

References:
- https://docs.lovable.dev/features/secrets
- https://ai.google.dev/gemini-api/docs/api-key
- https://ai.google.dev/gemini-api/docs/billing
