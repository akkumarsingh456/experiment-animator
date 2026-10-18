import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizeLatex, splitMath, isValidLatex } from "@/lib/latex-notation";
import { formulaPresentation } from "@/lib/formula-presentation";
import { MathText } from "@/components/MathText";
import { formulaVisualCards } from "@/lib/formula-visual-cards";
import { topicScienceDrawing } from "@/lib/topic-science-visuals";
import type { Slide } from "@/lib/generate.functions";
const tangent =
  "We have, for small angles, tan ∠ NOM = MNOMtan ∠ NCM = MNMCtan ∠ NIM = MNMI Refraction at a spherical surface separating two media.";
describe("reported refraction presentation regressions", () => {
  it.each(["sin", "cos", "tan", "log", "ln", "lim", "max", "min", "exp"])(
    "preserves authored %s commands during normalization",
    (fn) => {
      const result = normalizeLatex(`n_1\\${fn} i=n_2\\${fn} r`);
      expect(result).not.toContain(`\\\\${fn}`);
      expect(result).toContain(`\\${fn}`);
      expect(isValidLatex(result)).toBe(true);
    },
  );
  it("repairs the same exact relation in an older saved display string", () => {
    const source = String.raw`$n_1\\sin i=n_2\\sin r$`;
    const displayed = formulaPresentation(source);
    expect(displayed).toContain(String.raw`n_{1}\sin i=n_{2}\sin r`);
    expect(renderToStaticMarkup(<MathText text={source} />)).not.toContain('class="newline"');
  });
  it("keeps Snell’s law in a single mathematical relation on notes and visual cards", () => {
    const expression = String.raw`n_1\sin i=n_2\sin r`;
    const slide = {
      sections: [
        {
          heading: "Teacher Notes",
          kind: "bullets",
          lines: [`**Formula:** Snell’s law: $${expression}$`],
        },
      ],
      notes: [],
      bullets: [],
    } as unknown as Slide;
    const cards = formulaVisualCards(slide);
    expect(cards).toHaveLength(1);
    const html = renderToStaticMarkup(<MathText text={`$$${cards[0].expression}$$`} />);
    expect(html).not.toContain("katex-error");
    expect(html).not.toContain('class="newline"');
    expect(normalizeLatex(expression)).not.toContain(String.raw`\\sin`);
  });
  it.each([tangent, tangent.replace("NOM =", " $NOM =").replace("MNMI ", "MNMI$ ")])(
    "recovers only the complete known tangent triplet",
    (source) => {
      const displayed = formulaPresentation(source);
      expect(displayed).toContain(String.raw`\frac{\mathrm{MN}}{\mathrm{OM}}`);
      expect(displayed).toContain(String.raw`\frac{\mathrm{MN}}{\mathrm{MC}}`);
      expect(displayed).toContain(String.raw`\frac{\mathrm{MN}}{\mathrm{MI}}`);
      expect(displayed).toContain("Refraction at a spherical surface separating two media.");
      for (const segment of splitMath(displayed))
        if (segment.type !== "text") expect(isValidLatex(segment.value), segment.value).toBe(true);
      expect(renderToStaticMarkup(<MathText text={source} />)).not.toContain("katex-error");
    },
  );
  it("renders the sine ratio as one fraction, retaining its surrounding explanation", () => {
    const source =
      "Reflection is governed by the equation ∠ i = ∠ r′ and refraction by the Snell’s law, sin i/sin r = n, where the incident ray, reflected ray, refracted ray and normal lie in the same plane.";
    const displayed = formulaPresentation(source);
    expect(displayed).toContain(String.raw`\frac{\sin i}{\sin r}=n`);
    expect(displayed).toContain(
      "where the incident ray, reflected ray, refracted ray and normal lie in the same plane.",
    );
  });
  it("separates the glued equation and section references without deleting either", () => {
    const source =
      "Equation (9.2) then gives f = R/2 (9.3)9.2.3The mirror equation If rays emanating from a point actually meet at another point after reflection and/or refraction, that point is called the image of the first point.";
    const displayed = formulaPresentation(source);
    expect(displayed).toContain("(9.3) 9.2.3 The mirror equation");
    expect(displayed).toContain("that point is called the image of the first point.");
  });
  it("keeps prose out of a previously wrapped mirror relation", () => {
    const source = String.raw`Equation (9.2) then gives $f = \frac{R}{2} (9.3)9.2.3The$ mirror equation If rays emanate from a point.`;
    const displayed = formulaPresentation(source);
    expect(displayed).toContain("(9.3) 9.2.3 The mirror equation");
    expect(
      splitMath(displayed)
        .filter((segment) => segment.type !== "text")
        .every((segment) => !segment.value.includes("The")),
    ).toBe(true);
  });
  it("leaves unrelated joined letters and arbitrary trig expressions unchanged", () => {
    expect(formulaPresentation("Labels MNOM and MNMC are original data.")).toBe(
      "Labels MNOM and MNMC are original data.",
    );
    const good = String.raw`$\tan\theta=\frac{a}{b}$`;
    expect(formulaPresentation(good)).toBe(good);
  });
  it.each(["Physics", "Science"])(
    "keeps the named Refraction scientific diagram on %s discussion pages",
    (subject) => {
      const input = {
        title: "Refraction",
        sections: [
          {
            heading: "Classroom discussion",
            kind: "bullets" as const,
            lines: [
              "**Activity:** Evidence workshop — Refraction.",
              "**Activity source:** Equation (9.2) then gives f = R/2.",
            ],
          },
        ],
      };
      const drawing = topicScienceDrawing(input, subject)!;
      expect(drawing.id).toBe("refraction");
      expect(drawing.drawing).toContain("Normal");
      expect(drawing.drawing).toContain("Medium 1");
      expect(drawing.drawing).not.toContain("Share · Listen");
    },
  );
  it("retains the original general discussion illustration for an unnamed group discussion", () =>
    expect(
      topicScienceDrawing(
        {
          title: "Classroom discussion",
          sections: [
            { heading: "Classroom discussion", kind: "bullets", lines: ["Share evidence."] },
          ],
        },
        "Physics",
      )?.id,
    ).toBe("classroom-group-discussion"));
  it("never mutates source text, duplicate notes or saved diagrams", () => {
    const slide = Object.freeze({
      title: "Refraction",
      notes: Object.freeze([tangent, tangent]),
      reference_visuals: Object.freeze([{ url: "original.png" }]),
    });
    const before = JSON.stringify(slide);
    slide.notes.forEach((text) => renderToStaticMarkup(<MathText text={text} />));
    expect(JSON.stringify(slide)).toBe(before);
  });
});
