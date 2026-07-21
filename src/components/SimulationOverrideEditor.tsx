import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SIMULATIONS, type Simulation } from "@/config/simulations";

/**
 * Per-slide simulations editor. Lets the teacher reorder / remove the
 * auto-picked links, add extras from the catalog, or paste any URL.
 */
export function SimulationOverrideEditor({
  sims,
  onChange,
  onReset,
  isOverridden,
}: {
  sims: Simulation[];
  onChange: (next: Simulation[]) => void;
  onReset: () => void;
  isOverridden: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customProvider, setCustomProvider] = useState("");

  const active = sims;
  const activeIds = useMemo(() => new Set(active.map((s) => s.id)), [active]);

  const catalog = useMemo(() => {
    const needle = q.toLowerCase().trim();
    const pool = SIMULATIONS.filter((s) => !activeIds.has(s.id));
    if (!needle) return pool.slice(0, 12);
    return pool
      .filter((s) =>
        [s.title, s.provider, s.subjects.join(" "), s.keywords.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 20);
  }, [q, activeIds]);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= active.length) return;
    const next = active.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function remove(i: number) {
    onChange(active.filter((_, k) => k !== i));
  }
  function add(sim: Simulation) {
    if (activeIds.has(sim.id)) return;
    onChange([...active, sim]);
  }
  function addCustom() {
    const url = customUrl.trim();
    if (!url) return;
    let safe = url;
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") return;
      safe = u.toString();
    } catch { return; }
    const sim: Simulation = {
      id: `custom-${Date.now().toString(36)}`,
      title: customTitle.trim() || safe.replace(/^https?:\/\//, "").slice(0, 40),
      provider: customProvider.trim() || "Custom link",
      url: safe,
      page: safe,
      subjects: ["general"],
      keywords: [],
    };
    onChange([...active, sim]);
    setCustomTitle(""); setCustomUrl(""); setCustomProvider("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="absolute top-1 right-1 z-20 inline-flex items-center gap-1 text-[9px] font-medium bg-card/90 hover:bg-card border border-border/60 rounded px-1.5 py-0.5"
          title="Edit simulations for this slide"
        >
          <Pencil className="h-3 w-3" />Edit sims{isOverridden ? " ●" : ""}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-3 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold">Simulations for this slide</div>
          <div className="flex items-center gap-1">
            {isOverridden && (
              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={onReset} title="Reset to auto top 3">
                <RotateCcw className="h-3 w-3" />Auto
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => setOpen(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Active list */}
        <div className="space-y-1 mb-3">
          {active.length === 0 && (
            <div className="text-[11px] text-muted-foreground italic">No simulations. Add from the catalog or paste a URL below.</div>
          )}
          {active.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1 rounded border border-border/60 bg-secondary/40 px-1.5 py-1">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium truncate">{s.title}</div>
                <div className="text-[9px] text-muted-foreground truncate">{s.provider}</div>
              </div>
              <button className="p-1 hover:bg-secondary rounded disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} title="Move up">
                <ArrowUp className="h-3 w-3" />
              </button>
              <button className="p-1 hover:bg-secondary rounded disabled:opacity-30" disabled={i === active.length - 1} onClick={() => move(i, 1)} title="Move down">
                <ArrowDown className="h-3 w-3" />
              </button>
              <button className="p-1 hover:bg-destructive/10 text-destructive rounded" onClick={() => remove(i)} title="Remove">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Catalog search */}
        <div className="mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Add from catalog</div>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search PhET, GeoGebra, HHMI…" className="h-7 text-xs" />
          <div className="mt-1 max-h-40 overflow-y-auto space-y-1">
            {catalog.map((s) => (
              <button
                key={s.id}
                onClick={() => add(s)}
                className="w-full text-left flex items-center gap-1 rounded border border-border/50 hover:bg-secondary px-1.5 py-1"
              >
                <Plus className="h-3 w-3 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium truncate">{s.title}</div>
                  <div className="text-[9px] text-muted-foreground truncate">{s.provider} · {s.subjects.join(", ")}</div>
                </div>
              </button>
            ))}
            {catalog.length === 0 && <div className="text-[10px] text-muted-foreground italic px-1">No catalog matches.</div>}
          </div>
        </div>

        {/* Custom URL */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Add custom link</div>
          <div className="space-y-1">
            <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Title (optional)" className="h-7 text-xs" />
            <Input value={customProvider} onChange={(e) => setCustomProvider(e.target.value)} placeholder="Provider (optional)" className="h-7 text-xs" />
            <div className="flex gap-1">
              <Input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://…" className="h-7 text-xs" />
              <Button size="sm" className="h-7 px-2 text-xs" onClick={addCustom} disabled={!customUrl.trim()}>
                <Plus className="h-3 w-3" />Add
              </Button>
            </div>
            <p className="text-[9px] text-muted-foreground">Some sites block embedding — the viewer's "Open" button always works.</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
