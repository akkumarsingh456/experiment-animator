/**
 * AI setup for teacher notes and slide diagrams.
 *
 * Teacher-note writing, formula completion, notation repair, and optional
 * note diagrams use Groq's OpenAI-compatible Chat Completions API. Add a
 * server-side GROQ_API_KEY in Lovable Cloud or the local .env file.
 *
 * Do not expose this key through a VITE_ variable or client code.
 *
 * Slide infographics are generated as local SVGs from each slide's own notes.
 * They do not call an image API or require a separate image key.
 *
 * Groq's free plan has model-specific rate limits. If the key is missing or a
 * request is unavailable, the app keeps its deterministic local notes and
 * diagram fallback. The AI-expanded notes and formula derivations require a
 * valid key and available free-tier quota.
 *
 * Handwritten board-note OCR still uses the existing Lovable image endpoint
 * because it sends a teacher's handwritten image to an external AI service.
 * The slide infographic renderer does not send images to an external service.
 *
 * Current references:
 * - https://console.groq.com/docs/api-reference
 * - https://console.groq.com/docs/models
 * - https://console.groq.com/docs/rate-limits
 */
export const FREE_AI_SETUP = {
  env: "GROQ_API_KEY",
  endpoint: "https://api.groq.com/openai/v1/chat/completions",
  model: "openai/gpt-oss-120b",
  imageGeneration: "local-svg",
} as const;

export const MIGRATION_COMPLETE = true;
