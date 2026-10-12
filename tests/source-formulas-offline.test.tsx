import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ensureFormulaBlocks } from "@/lib/ncert-teacher-notes";
import PagedNoteSections from "@/components/PagedNoteSections";

describe("Real formula path with no AI credentials", () => {
  it("adds and renders Coulomb's law from named source evidence without an AI request or changing approved derivations", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "");
    const fetch = vi.spyOn(globalThis, "fetch");
    const approved = ["**Explanation:** Coulomb's law describes the force between point charges.", "**Derivation step 1:** Retain this exact approved wording."];
    const original = { title:"Coulomb's Law", kind:"content", bullets:[], notes:[], sections:[{heading:"Teacher Notes",kind:"bullets" as const,lines:approved}] };
    try {
      const [updated] = await ensureFormulaBlocks([original],{klass:"12",subject:"Physics",chapter:"Electric Charges and Fields"});
      expect(updated.sections[0].lines.slice(0,2)).toEqual(approved);
      expect(updated.sections[0].lines.join(" ")).toContain("\\varepsilon_0");
      const html = renderToStaticMarkup(<PagedNoteSections sections={updated.sections} subject="Physics" />);
      expect(html).toContain("katex"); expect(html).toContain("mfrac"); expect(html).not.toContain("katex-error");
      expect(fetch).not.toHaveBeenCalled(); expect(original.sections[0].lines).toEqual(approved);
    } finally { fetch.mockRestore(); vi.unstubAllEnvs(); }
  });
});
