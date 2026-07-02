/**
 * AI text gateway — uses Lovable AI Gateway (google/gemini-3-flash-preview).
 * Text generation is inexpensive; this restores fast, reliable lesson JSON
 * after the Groq free-tier path (mixtral decommissioned) started timing out.
 */

type AIResponse = {
  slides?: unknown;
  activities?: unknown;
  video?: unknown;
};

const MODEL = "google/gemini-3-flash-preview";
const ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function callFreeAI(systemPrompt: string, userPrompt: string): Promise<AIResponse> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    console.warn("LOVABLE_API_KEY missing — returning empty lesson so fallback slides render.");
    return {};
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`Lovable AI ${res.status}:`, errText.slice(0, 300));
      return {};
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : {};
    }
  } catch (err) {
    console.error("callFreeAI failed:", err);
    return {};
  } finally {
    clearTimeout(timer);
  }
}

export type { AIResponse };
