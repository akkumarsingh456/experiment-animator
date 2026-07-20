import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import type { Simulation } from "@/config/simulations";

/**
 * Embeds a free-web simulation (PhET / GeoGebra / HHMI / etc.) inside an
 * iframe. Some providers set X-Frame-Options and will refuse to render; the
 * "Open in new tab" button is always available so students never hit a
 * dead end.
 */
export function SimulationViewer({ sims, className }: { sims: Simulation[]; className?: string }) {
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  if (!sims || sims.length === 0) return null;
  const sim = sims[Math.min(active, sims.length - 1)];

  return (
    <div className={`relative flex flex-col w-full h-full bg-card border border-border/50 rounded-md overflow-hidden ${className ?? ""}`}>
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border/50 bg-secondary/40 shrink-0 overflow-x-auto">
        {sims.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { setActive(i); setLoaded(false); }}
            className={`text-[10px] whitespace-nowrap px-2 py-0.5 rounded font-medium transition ${i === active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
            title={`${s.provider} — ${s.title}`}
          >
            {s.title}
          </button>
        ))}
        <a
          href={sim.page}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/60 hover:bg-secondary text-foreground/80"
          title="Open in new tab"
        >
          <ExternalLink className="h-3 w-3" /> Open
        </a>
      </div>
      <div className="relative flex-1 min-h-0 bg-black/5">
        {!loaded ? (
          <div className="absolute inset-0 grid place-items-center text-[10px] text-muted-foreground gap-1 pointer-events-none">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading {sim.provider}…
          </div>
        ) : null}
        <iframe
          key={sim.id}
          src={sim.url}
          title={sim.title}
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 w-full h-full border-0"
          allow="fullscreen; accelerometer; gyroscope; autoplay; encrypted-media"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock"
        />
      </div>
      <div className="px-2 py-1 text-[9px] text-muted-foreground border-t border-border/40 shrink-0 truncate">
        {sim.provider} · Free web simulation · If the panel is blank, click <span className="font-semibold">Open</span> to launch it.
      </div>
    </div>
  );
}
