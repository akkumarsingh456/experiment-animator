/** Dedicated vision reader. Formula/derivation generation uses its existing helper. */
export async function readBookImageJSON<T>(opts: { prompt: string; schemaName: string; schema: Record<string, unknown>; images: string[] }): Promise<T> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Scanned-book reading is unavailable. Configure the website’s AI connection to read these handwritten pages.");
  let response: Response;
  try {
    response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST", signal: AbortSignal.timeout(90_000),
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({ model: "openai/gpt-6-astra", stream: true, store: false,
        reasoning: { effort: "low" },
        input: [{ role: "user", content: [{ type: "input_text", text: opts.prompt }, ...opts.images.map(image_url => ({ type: "input_image", image_url }))] }],
        text: { format: { type: "json_schema", name: opts.schemaName, strict: true, schema: opts.schema } },
      }),
    });
  } catch (error) {
    if (error instanceof Error && /abort|timeout/i.test(error.name)) throw new Error("Book image reader timed out; completed pages are saved.");
    throw error;
  }
  if (!response.ok) {
    const status = response.status;
    // Never expose upstream bodies, credentials or scanned content in the UI.
    if (status === 401 || status === 403) throw new Error("Book image reader access was denied. Check the website’s AI connection in Lovable.");
    if (status === 402) throw new Error("Book image reading needs available Lovable AI credits. Completed pages are saved.");
    if (status === 429) throw new Error("Book image reader is busy (429). Resume shortly; completed pages are saved.");
    if (status >= 500) throw new Error(`Book image reader connection failed (${status}). Resume to retry.`);
    throw new Error(`Book image reader rejected the page (${status}). Check the website’s AI configuration.`);
  }
  return parseBookImageResponse<T>(response);
}

/** Handles LF/CRLF streams, completion-only responses and a final unterminated frame. */
export async function parseBookImageResponse<T>(response: Response): Promise<T> {
  let text = "", finalText = "", completedText = "", pending = "", failed = false, refused = false;
  const event = (value: any) => {
    if (value.type === "response.output_text.delta") text += value.delta || "";
    if (value.type === "response.output_text.done") finalText = value.text || finalText;
    if (value.type?.startsWith("response.refusal")) refused = true;
    if (["error", "response.failed", "response.incomplete"].includes(value.type)) failed = true;
    const result = value.response || (value.output ? value : null);
    if (result) {
      if (["failed", "incomplete"].includes(result.status)) failed = true;
      const contents = (result.output || []).flatMap((item: any) => item.content || []);
      refused ||= contents.some((item: any) => item.type === "refusal");
      completedText = contents.filter((item: any) => item.type === "output_text").map((item: any) => item.text || "").join("") || completedText;
    }
  };
  if (response.headers.get("content-type")?.includes("application/json")) event(await response.json());
  else {
    if (!response.body) throw new Error("Book image reader returned an empty response. Resume to retry.");
    const reader = response.body.getReader(), decoder = new TextDecoder();
    const line = (raw: string) => {
      if (!raw.startsWith("data:")) return;
      const data = raw.slice(5).trim();
      if (!data || data === "[DONE]") return;
      try { event(JSON.parse(data)); } catch { failed = true; }
    };
    try {
      for (;;) {
        const { value, done } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        const lines = pending.split(/\r?\n/); pending = lines.pop() || "";
        lines.forEach(line);
        if (done) { if (pending) line(pending); break; }
      }
    } finally { reader.releaseLock(); }
  }
  if (refused) throw new Error("The book image reader could not process this page. No substitute image was added.");
  if (failed) throw new Error("Book image reader returned an incomplete response. Resume to retry; completed pages are saved.");
  const output = (completedText || finalText || text).trim();
  if (!output) throw new Error("Book image reader returned no page data. Check the website’s AI connection and resume.");
  try { return JSON.parse(output) as T; }
  catch { throw new Error("Book image reader returned invalid page data. No unverified picture was added."); }
}
