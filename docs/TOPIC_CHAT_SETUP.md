# Topic chat AI connection

The main recovery popup is now **Get topic notes → review/edit → Extract notes**. It does not require an AI key. Paste-and-extract also works without a network request. The Class 12 Chemistry Solutions topics concentration terms, vapour pressure, Raoult's law and colligative properties have reviewed supplementary summaries with chapter references, so an upstream blocked host does not prevent their display. These summaries are not live AI or verbatim NCERT extraction. Other topics use the official source reader and report unavailability honestly. The AI connection below is optional, under Ask the connected AI.

The missing-topic chat supports direct Gemini and Groq connections, independent of Lovable AI credits. This does not change normal lesson generation or any image feature.

## One-time setup

1. Create a key in [Google AI Studio](https://aistudio.google.com/apikey) or [Groq Console](https://console.groq.com/keys).
2. Add **GEMINI_API_KEY** or **GROQ_API_KEY** in the deployed website's server secrets/environment settings. Never put it in a chat message, browser field, source file or `VITE_` variable.
3. Redeploy/publish the website and retry the topic chat.

Gemini defaults to `gemini-3.1-flash-lite`; override with `GEMINI_TOPIC_CHAT_MODEL` if needed. `GOOGLE_API_KEY` is also accepted. Groq defaults to the open-weight `openai/gpt-oss-120b`; override with `GROQ_TOPIC_CHAT_MODEL` if your account requires another supported JSON model.

Order: Gemini → Groq → the existing Lovable gateway, using only configured services. Each candidate still passes the same source and schema checks. A rejected response or unavailable provider falls through to the next one. The reply displays its actual provider.

## Free-tier limits

[Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) offers free-tier input/output for eligible models with account and regional limits. [Groq rate limits](https://console.groq.com/docs/rate-limits) depend on the account and model. An API key is required even on a free tier. These integrations do not create an account, enable billing or guarantee unlimited free access. Check your provider account's quota and billing configuration.

Only public official evidence, the fixed lesson scope, and the submitted conversation are sent to a configured service. No workspace notebooks, account credentials or unrelated lessons are included. Every final note must cite readable official evidence internally; adding a provider does not permit unsupported facts when sources are unavailable.

## Troubleshooting

- **Connection not configured:** add one of the server secrets above; a ChatGPT or Gemini consumer subscription is not an API key.
- **No matching official evidence:** the source cannot be read or matched. Retry source lookup; provider changes cannot replace missing evidence.
- **Services could not return checked notes:** check provider keys, model availability and quota. Existing notes and teacher drafts remain intact.

No live provider validation was performed without a configured key.
