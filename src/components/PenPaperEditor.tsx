import { useRef, useState } from "react";
import { Eraser, Loader2, PenLine, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { penToLatex } from "@/lib/pen-notes.functions";
import { MathText } from "@/components/MathText";

/**
 * Pen & paper board: the teacher hand-writes a formula/note (or types it),
 * Gemini rewrites it as correct LaTeX, and it is saved onto the slide's blank
 * space permanently (localStorage) so it is never asked again.
 */
export function PenPaperEditor({
  lines,
  onSave,
  subject,
  topic,
}: {
  lines: string[];
  onSave: (next: string[]) => void;
  subject?: string;
  topic?: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<string[]>(lines);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const convert = useServerFn(penToLatex);

  function ctx() {
    const c = canvasRef.current;
    if (!c) return null;
    const g = c.getContext("2d");
    if (!g) return null;
    g.lineWidth = 3;
    g.lineCap = "round";
    g.strokeStyle = "#1f2a4a";
    return g;
  }

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    const g = ctx();
    if (!g) return;
    drawing.current = true;
    dirty.current = true;
    const p = pos(e);
    g.beginPath();
    g.moveTo(p.x, p.y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const g = ctx();
    if (!g) return;
    const p = pos(e);
    g.lineTo(p.x, p.y);
    g.stroke();
  }
  function up() {
    drawing.current = false;
  }
  function clearBoard() {
    const c = canvasRef.current;
    const g = ctx();
    if (c && g) g.clearRect(0, 0, c.width, c.height);
    dirty.current = false;
  }

  async function readIt() {
    if (!dirty.current && !typed.trim()) {
      toast.error("Write a formula on the board or type it first.");
      return;
    }
    setBusy(true);
    try {
      const image = dirty.current ? flatten() : undefined;
      const res = await convert({ data: { text: typed.trim() || undefined, imageDataUrl: image, subject, topic } });
      if (res.error || !res.lines.length) {
        toast.error(res.error || "Could not read the writing.");
        return;
      }
      const seen = new Set(draft.map((l) => l.toLowerCase()));
      setDraft([...draft, ...res.lines.filter((l) => !seen.has(l.toLowerCase()))]);
      setTyped("");
      clearBoard();
      toast.success(`Typeset ${res.lines.length} line(s) in LaTeX.`);
    } finally {
      setBusy(false);
    }
  }

  /** White-background PNG so the model sees dark ink on paper. */
  function flatten(): string | undefined {
    const c = canvasRef.current;
    if (!c) return undefined;
    const out = document.createElement("canvas");
    out.width = c.width;
    out.height = c.height;
    const g = out.getContext("2d");
    if (!g) return undefined;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, out.width, out.height);
    g.drawImage(c, 0, 0);
    return out.toDataURL("image/png");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setDraft(lines);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-[10px]">
          <PenLine className="h-3 w-3" /> Pen &amp; paper
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">Write a formula — AI typesets it in LaTeX</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-border/60 bg-[repeating-linear-gradient(0deg,transparent,transparent_23px,hsl(var(--border))_24px)] overflow-hidden">
            <canvas
              ref={canvasRef}
              width={1000}
              height={280}
              className="w-full h-[180px] touch-none cursor-crosshair"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerLeave={up}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px]" onClick={clearBoard}>
              <Eraser className="h-3 w-3" /> Clear board
            </Button>
            <span className="text-[10px] text-muted-foreground">…or type it (plain text is fine — e.g. “v = u + at”, “H2SO4”)</span>
          </div>
          <Textarea
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Formula or note to typeset…"
            className="min-h-[60px] text-xs"
          />
          <Button onClick={readIt} disabled={busy} size="sm" className="gap-1.5">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {busy ? "Reading your writing…" : "Read & typeset in LaTeX"}
          </Button>

          {draft.length > 0 && (
            <div className="rounded-md border border-border/60 bg-secondary/40 p-3 space-y-1.5">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-primary">On the slide</div>
              {draft.map((l, i) => (
                <div key={i} className="flex items-start gap-2 text-[12.5px] leading-snug">
                  <span className="flex-1">
                    <MathText text={l} />
                  </span>
                  <button
                    className="opacity-50 hover:opacity-100 shrink-0"
                    onClick={() => setDraft(draft.filter((_, k) => k !== i))}
                    aria-label="Remove line"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-[11px] text-destructive"
              onClick={() => setDraft([])}
              disabled={!draft.length}
            >
              <Trash2 className="h-3 w-3" /> Remove all
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onSave(draft);
                setOpen(false);
                toast.success("Saved to this slide — it won't be asked again.");
              }}
            >
              Save to slide
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PenPaperEditor;
