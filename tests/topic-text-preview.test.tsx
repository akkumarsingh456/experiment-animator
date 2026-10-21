import { it, expect, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { TopicTextPreview } from "@/components/TopicTextPreview";
it("shows source sentences as paragraphs and imports only the selected passage without rewriting", async () => {
  const lines = [
    "Primary valencies are normally ionisable.",
    "Secondary valencies are non ionisable.",
  ];
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host),
    receive = vi.fn();
  await act(async () =>
    root.render(<TopicTextPreview lines={lines} subject="Chemistry" onImport={receive} />),
  );
  expect(
    host.querySelector('[aria-label="Source notes preview"]')?.querySelectorAll("p"),
  ).toHaveLength(2);
  await act(async () =>
    host.querySelector<HTMLInputElement>('[aria-label="Select passage 2"]')!.click(),
  );
  await act(async () =>
    Array.from(host.querySelectorAll("button"))
      .find((button) => button.textContent?.startsWith("Import selected passages"))!
      .click(),
  );
  expect(receive).toHaveBeenLastCalledWith([lines[1]], false);
  await act(async () =>
    Array.from(host.querySelectorAll("button"))
      .find((button) => button.textContent === "Points")!
      .click(),
  );
  expect(host.querySelector('[aria-label="Source notes preview"]')?.textContent).toContain("•");
  await act(async () =>
    Array.from(host.querySelectorAll("button"))
      .find((button) => button.textContent === "Import these notes")!
      .click(),
  );
  expect(receive).toHaveBeenLastCalledWith(lines, true);
  expect(lines).toEqual([
    "Primary valencies are normally ionisable.",
    "Secondary valencies are non ionisable.",
  ]);
  await act(async () => root.unmount());
  host.remove();
});
