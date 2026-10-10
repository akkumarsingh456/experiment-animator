/**
 * Server-only helper: one streamed Lovable AI Gateway Responses call that
 * returns strict-schema JSON. Used by the formula / derivation passes.
 * Returns null on any failure so callers can keep their safe fallbacks.
 */

const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";

export function hasGatewayKey(): boolean {
  return Boolean(process.env.LOVABLE_API_KEY);
}

export async function gatewayJSON<T>(opts: {
  prompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
  reasoningEffort?: "low" | "medium" | "high";
}): Promise<T | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      signal: AbortSignal.timeout(90_000),
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: MODEL,
        input: [{ role: "user", content: opts.prompt }],
        stream: true,
        store: false,
        reasoning: { effort: opts.reasoningEffort || "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        text: { format: { type: "json_schema", name: opts.schemaName, strict: true, schema: opts.schema } },
      }),
    });
    if (!res.ok || !res.body) {
      console.warn(`ai-gateway ${opts.schemaName}`, res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let text = "";
    let finalText = "";
    let refused = false;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n\n")) >= 0) {
        const frame = buf.slice(0, nl);
        buf = buf.slice(nl + 2);
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const ev = JSON.parse(data);
            if (ev.type === "response.output_text.delta") text += ev.delta || "";
            else if (ev.type === "response.output_text.done") finalText = ev.text || finalText;
            else if (ev.type === "response.refusal.delta" || ev.type === "response.refusal.done") refused = true;
            else if (ev.type === "error" || ev.type === "response.failed") {
              console.warn(`ai-gateway ${opts.schemaName} stream error`, JSON.stringify(ev).slice(0, 200));
            }
          } catch {
            /* partial or non-JSON frame */
          }
        }
      }
    }
    if (refused) return null;
    const out = (finalText || text).trim();
    if (!out) return null;
    return JSON.parse(out) as T;
  } catch (e) {
    console.warn(`ai-gateway ${opts.schemaName} failed`, e);
    return null;
  }
}
