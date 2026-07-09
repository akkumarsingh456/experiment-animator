import { useEffect, useRef, useState, useId } from "react";
import mermaid from "mermaid";

let initialized = false;
function ensureInit() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
    fontFamily: "Inter, system-ui, sans-serif",
    flowchart: { htmlLabels: true, curve: "basis", padding: 12 },
  });
  initialized = true;
}

export function MermaidDiagram({ code, className }: { code: string; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    ensureInit();
    let cancelled = false;
    (async () => {
      try {
        const clean = (code || "graph TD; A[NCERT concept] --> B[Key idea]").trim();
        const { svg } = await mermaid.render(`m-${id}`, clean);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Diagram render failed");
      }
    })();
    return () => { cancelled = true; };
  }, [code, id]);

  if (error) {
    return (
      <div className={`grid place-items-center text-[10px] text-muted-foreground p-3 ${className ?? ""}`}>
        Diagram unavailable
      </div>
    );
  }
  return <div ref={ref} className={`mermaid-host w-full h-full grid place-items-center [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:h-auto [&_svg]:w-auto ${className ?? ""}`} />;
}
