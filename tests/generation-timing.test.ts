import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LESSON_REQUEST_TIMEOUT_MS } from "@/lib/generation-timing";

/**
 * Lesson generation must never be cut short by an artificial AI-call timer:
 * the 90-second abort in the gateway client was discarding otherwise-complete
 * lessons and forcing slow fallbacks. These tests lock the fix in place.
 */
describe("lesson generation timing", () => {
  it("gives interactive lesson requests a 5-minute window", () => {
    expect(LESSON_REQUEST_TIMEOUT_MS).toBe(300_000);
  });

  it("makes AI gateway calls without an artificial timeout", () => {
    const client = readFileSync("src/lib/structured-response-client.ts", "utf8");
    expect(client).not.toContain("AbortSignal.timeout");
  });

  it("keeps the masterclass notes call at medium reasoning effort", () => {
    const notes = readFileSync("src/lib/ncert-teacher-notes.ts", "utf8");
    const call = notes.match(/schemaName: "complete_lesson_notes", reasoningEffort: "(\w+)"/);
    expect(call?.[1]).toBe("medium");
  });
});
