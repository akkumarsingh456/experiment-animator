import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  generateLesson,
  type GenerationResult,
  type Slide,
} from "@/lib/generate.functions";
import {
  Atom,
  Beaker,
  Brain,
  Cpu,
  Dna,
  FlaskConical,
  Function,
  Heart,
  Leaf,
  Lightbulb,
  Magnet,
  Microscope,
  Orbit,
  Prism,
  Ruler,
  Zap,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Pencil,
  Loader2,
  ArrowLeft,
  Sparkles,
  Play,
  GraduationCap,
} from "lucide-react";

const SearchSchema = z.object({
  topic: z.string().default(""),
  subtopics: z.string().default(""),
  klass: z.string().default("10"),
  subject: z.string().default("Science"),
  chapter: z.string().default(""),
});

export const Route = createFileRoute("/generate")({
  validateSearch: SearchSchema,
  head: () => ({ meta: [{ title: "Generated Lesson — EduPlan AI" }] }),
  component: GeneratePage,
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  atom: Atom, beaker: Beaker, leaf: Leaf, magnet: Magnet, microscope: Microscope,
  flask: FlaskConical, dna: Dna, lightbulb: Lightbulb, function: Function,
  circuit: Cpu, planet: Orbit, ruler: Ruler, prism: Prism, heart: Heart,
  brain: Brain, bolt: Zap,
};

function GeneratePage() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const run = useServerFn(generateLesson);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!search.topic) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    run({ data: search })
      .then((r) => { if (!cancelled) setResult(r); })
      .catch((e) => { if (!cancelled) setError(e?.message ?? String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search.topic, search.subtopics, search.klass, search.subject, search.chapter]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border/60 print:hidden">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground grid place-items-center">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-display font-extrabold tracking-tight">EduPlan AI</span>
          </Link>
          <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="h-4 w-4" />New search</Link></Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-8">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Badge variant="secondary" className="rounded-full"><Sparkles className="h-3.5 w-3.5" />Class {search.klass}</Badge>
          <Badge variant="outline" className="rounded-full">{search.subject}</Badge>
          {search.chapter && <Badge variant="outline" className="rounded-full">Ch. {search.chapter}</Badge>}
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight ml-1">{search.topic || "Untitled"}</h1>
        </div>

        {loading && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-4 font-medium">Reading your NCERT chapter…</p>
              <p className="text-sm text-muted-foreground mt-1">
                Filtering only matching PDF, ranking relevant passages, building 10-slide lesson and 3D storyboard.
              </p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-6">
              <p className="font-semibold text-destructive">Generation failed</p>
              <p className="text-sm mt-1">{error}</p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => nav({ to: "/upload" })}>Go to Upload</Button>
                <Button size="sm" variant="outline" onClick={() => nav({ to: "/" })}>Back home</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {result && <ResultView result={result} title={search.topic} />}
      </div>
    </div>
  );
}

function ResultView({ result, title }: { result: GenerationResult; title: string }) {
  const [slides, setSlides] = useState<Slide[]>(result.slides);
  const [activeIdx, setActiveIdx] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [editing, setEditing] = useState(false);

  // Keep slides if result changes
  useEffect(() => setSlides(result.slides), [result.slides]);

  function updateSlide(idx: number, patch: Partial<Slide>) {
    setSlides((s) => s.map((sl, i) => (i === idx ? { ...sl, ...patch } : sl)));
  }

  async function downloadPDF() {
    window.print();
  }

  async function downloadPPTX() {
    try {
      const pptxgen = (await import("pptxgenjs")).default;
      const pptx = new pptxgen();
      pptx.layout = "LAYOUT_WIDE";
      slides.forEach((s) => {
        const slide = pptx.addSlide();
        slide.background = { color: "F7F8FC" };
        slide.addText(s.title || "", { x: 0.5, y: 0.4, w: 12, h: 0.9, fontSize: 32, bold: true, color: "1F2A4A", fontFace: "Calibri" });
        slide.addText((s.bullets || []).map((b) => ({ text: b, options: { bullet: true } })),
          { x: 0.7, y: 1.6, w: 11, h: 4.5, fontSize: 20, color: "33415C", fontFace: "Calibri" });
        if (s.caption) slide.addText(s.caption, { x: 0.7, y: 6.4, w: 11, h: 0.6, fontSize: 14, italic: true, color: "5A6B91" });
      });
      await pptx.writeFile({ fileName: `${title || "lesson"}.pptx` });
    } catch (e) {
      toast.error("PPTX export failed");
      console.error(e);
    }
  }

  return (
    <>
      {/* Slides */}
      <section className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 print:hidden">
          <h2 className="font-semibold text-lg">10-Slide Interactive Lesson</h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={editing ? "default" : "outline"} onClick={() => setEditing((v) => !v)}>
              <Pencil className="h-4 w-4" />{editing ? "Done editing" : "Edit slides"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPresenting(true)}>
              <Maximize2 className="h-4 w-4" />Presentation Mode
            </Button>
            <Button size="sm" variant="outline" onClick={downloadPDF}>
              <Download className="h-4 w-4" />PDF
            </Button>
            <Button size="sm" onClick={downloadPPTX}>
              <Download className="h-4 w-4" />PPTX
            </Button>
          </div>
        </div>

        {/* Active slide */}
        <SlideCanvas
          slide={slides[activeIdx]}
          index={activeIdx}
          total={slides.length}
          editing={editing}
          onChange={(patch) => updateSlide(activeIdx, patch)}
        />

        {/* Nav */}
        <div className="flex items-center justify-between mt-4 print:hidden">
          <Button variant="outline" size="sm" disabled={activeIdx === 0} onClick={() => setActiveIdx((i) => i - 1)}>
            <ChevronLeft className="h-4 w-4" />Prev
          </Button>
          <div className="text-sm text-muted-foreground">{activeIdx + 1} / {slides.length}</div>
          <Button variant="outline" size="sm" disabled={activeIdx === slides.length - 1} onClick={() => setActiveIdx((i) => i + 1)}>
            Next<ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Thumbnails */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 print:hidden">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`text-left rounded-lg border p-2 text-xs transition ${
                i === activeIdx ? "border-primary bg-primary/5" : "border-border hover:bg-card/60"
              }`}
            >
              <div className="font-semibold truncate">{i + 1}. {s.title}</div>
              <div className="text-muted-foreground truncate">{s.bullets?.[0]}</div>
            </button>
          ))}
        </div>

        {/* Print stack — all 10 slides for PDF export */}
        <div className="hidden print:block">
          {slides.map((s, i) => (
            <div key={i} className="break-after-page mb-6">
              <SlideCanvas slide={s} index={i} total={slides.length} editing={false} onChange={() => {}} />
            </div>
          ))}
        </div>
      </section>

      {/* Activities */}
      <ActivitiesView activities={result.activities} />

      {/* Video storyboard */}
      <VideoView video={result.video} />

      {/* Source */}
      <p className="text-xs text-muted-foreground mt-10">
        Source: {result.source_books.map((b) => `${b.subject} · Class ${b.class} · ${b.chapter}`).join(", ")} ({result.context_chars.toLocaleString()} chars of NCERT text)
      </p>

      {presenting && (
        <PresentationMode slides={slides} onClose={() => setPresenting(false)} />
      )}
    </>
  );
}

function SlideCanvas({
  slide, index, total, editing, onChange,
}: { slide: Slide; index: number; total: number; editing: boolean; onChange: (p: Partial<Slide>) => void }) {
  if (!slide) return null;
  const Icon = ICONS[(slide.visual || "atom").toLowerCase()] ?? Atom;
  return (
    <Card className="overflow-hidden border-border/60 shadow-soft">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-[1fr_320px] min-h-[420px]">
          <div className="p-6 sm:p-10 flex flex-col">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span className="font-mono">Slide {index + 1} / {total}</span>
              <Badge variant="outline" className="rounded-full text-[10px]">NCERT-grounded</Badge>
            </div>
            {editing ? (
              <Input
                value={slide.title}
                onChange={(e) => onChange({ title: e.target.value })}
                className="font-display text-2xl sm:text-3xl font-bold border-0 px-0 shadow-none focus-visible:ring-0 h-auto"
              />
            ) : (
              <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{slide.title}</h3>
            )}
            <ul className="mt-5 space-y-2 flex-1">
              {(slide.bullets || []).map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {editing ? (
                    <Textarea
                      value={b}
                      onChange={(e) => {
                        const next = [...slide.bullets];
                        next[i] = e.target.value;
                        onChange({ bullets: next });
                      }}
                      className="min-h-[40px] resize-none"
                    />
                  ) : (
                    <p className="text-sm sm:text-base leading-relaxed">{b}</p>
                  )}
                </li>
              ))}
            </ul>
            {(editing || slide.caption) && (
              <div className="mt-4">
                {editing ? (
                  <Input
                    value={slide.caption ?? ""}
                    placeholder="Caption (optional)"
                    onChange={(e) => onChange({ caption: e.target.value })}
                  />
                ) : (
                  <p className="text-xs italic text-muted-foreground">{slide.caption}</p>
                )}
              </div>
            )}
          </div>
          <div className="relative bg-gradient-to-br from-primary/10 via-secondary to-accent/30 grid place-items-center p-6 border-t md:border-t-0 md:border-l border-border/60">
            <div className="absolute top-3 right-3 text-[10px] font-mono text-muted-foreground bg-card/70 rounded px-2 py-0.5">3D model · {slide.visual}</div>
            <div className="h-32 w-32 rounded-full bg-card shadow-glow grid place-items-center animate-pulse">
              <Icon className="h-16 w-16 text-primary" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivitiesView({ activities }: { activities: GenerationResult["activities"] }) {
  if (!activities || activities.length === 0) {
    return (
      <section className="mb-10">
        <h2 className="font-semibold text-lg mb-3">NCERT Activity / Experiment</h2>
        <Card className="border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No explicit "Activity" was detected for this topic in the filtered chapter.
          </CardContent>
        </Card>
      </section>
    );
  }
  return (
    <section className="mb-10">
      <h2 className="font-semibold text-lg mb-3">NCERT Activity — step-by-step</h2>
      <div className="space-y-4">
        {activities.map((a, idx) => (
          <Card key={idx} className="border-border/60 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="h-4 w-4 text-chemistry" />
                <h3 className="font-semibold">{a.name}</h3>
              </div>
              <p className="text-sm"><span className="font-medium">Objective:</span> {a.objective}</p>
              {a.apparatus?.length > 0 && (
                <p className="text-sm mt-2"><span className="font-medium">Apparatus:</span> {a.apparatus.join(", ")}</p>
              )}
              <ol className="mt-4 space-y-3">
                {a.steps?.map((st) => (
                  <li key={st.step} className="flex gap-3">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">{st.step}</div>
                    <div>
                      <div className="font-medium text-sm">{st.title}</div>
                      <div className="text-sm text-muted-foreground leading-relaxed">{st.description}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-secondary/60 p-3"><span className="font-medium">Observation: </span>{a.observation}</div>
                <div className="rounded-lg bg-accent/30 p-3"><span className="font-medium">Conclusion: </span>{a.conclusion}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function VideoView({ video }: { video: GenerationResult["video"] }) {
  const [playing, setPlaying] = useState(false);
  const [sceneIdx, setSceneIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scenes = video?.scenes ?? [];

  useEffect(() => {
    if (!playing || scenes.length === 0) return;
    const dur = (scenes[sceneIdx]?.duration_s ?? 5) * 1000;
    timer.current = setTimeout(() => {
      if (sceneIdx < scenes.length - 1) setSceneIdx((i) => i + 1);
      else setPlaying(false);
    }, dur);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [playing, sceneIdx, scenes]);

  if (scenes.length === 0) return null;
  const current = scenes[sceneIdx];

  return (
    <section className="mb-10">
      <h2 className="font-semibold text-lg mb-3">3D Animated Experiment Video</h2>
      <Card className="overflow-hidden border-border/60 shadow-soft">
        <CardContent className="p-0">
          <div className="aspect-video bg-gradient-to-br from-foreground via-primary/40 to-chemistry/40 relative grid place-items-center overflow-hidden">
            <div className="absolute inset-0 grid-paper opacity-20" />
            <div key={sceneIdx} className="relative text-center px-6 max-w-2xl animate-in fade-in zoom-in-95 duration-700">
              <Badge className="bg-background/80 text-foreground border border-border rounded-full mb-3">
                Scene {current.scene} / {scenes.length} · {current.duration_s}s
              </Badge>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-background drop-shadow-lg">{current.title}</h3>
              <p className="mt-3 text-background/90 text-sm sm:text-base italic">"{current.narration}"</p>
              <p className="mt-4 text-background/70 text-xs font-mono leading-relaxed">{current.visual_prompt}</p>
            </div>
            <button
              onClick={() => { setPlaying((p) => !p); if (!playing && sceneIdx === scenes.length - 1) setSceneIdx(0); }}
              className="absolute bottom-5 right-5 h-12 w-12 rounded-full bg-background text-foreground grid place-items-center shadow-glow hover:scale-105 transition"
            >
              {playing ? <span className="text-lg">⏸</span> : <Play className="h-5 w-5" />}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 border-t border-border/60 text-xs">
            {scenes.map((s, i) => (
              <button
                key={i}
                onClick={() => { setSceneIdx(i); setPlaying(false); }}
                className={`p-3 text-center font-medium border-r border-border/60 last:border-r-0 truncate transition ${
                  i === sceneIdx ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-card"
                }`}
              >
                {i + 1}. {s.title}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function PresentationMode({ slides, onClose }: { slides: Slide[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " ") setI((x) => Math.min(slides.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    }
    window.addEventListener("keydown", onKey);
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      window.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [slides.length, onClose]);

  const s = slides[i];
  const Icon = ICONS[(s?.visual || "atom").toLowerCase()] ?? Atom;
  return (
    <div className="fixed inset-0 z-50 bg-foreground text-background flex flex-col">
      <div className="flex-1 grid place-items-center p-6 sm:p-12">
        <div className="max-w-4xl w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-background/10 grid place-items-center">
              <Icon className="h-7 w-7" />
            </div>
            <div className="text-xs font-mono opacity-60">Slide {i + 1} / {slides.length}</div>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold leading-tight">{s.title}</h2>
          <ul className="mt-8 space-y-4">
            {(s.bullets || []).map((b, k) => (
              <li key={k} className="flex gap-3 text-lg sm:text-2xl">
                <span className="opacity-50">{k + 1}.</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {s.caption && <p className="mt-8 italic opacity-70">{s.caption}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between p-4 border-t border-background/10">
        <Button variant="ghost" size="sm" onClick={onClose} className="text-background hover:bg-background/10">Exit ✕</Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => setI(i - 1)} className="text-background hover:bg-background/10">
            <ChevronLeft className="h-4 w-4" />Prev
          </Button>
          <Button variant="ghost" size="sm" disabled={i === slides.length - 1} onClick={() => setI(i + 1)} className="text-background hover:bg-background/10">
            Next<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
