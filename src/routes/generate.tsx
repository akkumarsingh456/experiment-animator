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
  generateSlideImage,
  type GenerationResult,
  type Slide,
} from "@/lib/generate.functions";
import { SimulationViewer } from "@/components/SimulationViewer";
import { SimulationOverrideEditor } from "@/components/SimulationOverrideEditor";
import { pickSimulations } from "@/config/simulations";
import { slideKey, useSimOverride } from "@/lib/sim-overrides";
import {
  Atom,
  Beaker,
  Brain,
  Cpu,
  Dna,
  FlaskConical,
  Sigma,
  Heart,
  Leaf,
  Lightbulb,
  Magnet,
  Microscope,
  Orbit,
  Triangle,
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
  topic: z.coerce.string().default(""),
  subtopics: z.coerce.string().default(""),
  klass: z.coerce.string().default("10"),
  subject: z.coerce.string().default("Science"),
  chapter: z.coerce.string().default(""),
  mode: z.enum(["topic", "chapter"]).default("topic"),
  go: z.coerce.string().default(""),
});

const LANGUAGE_SUBJECTS = ["english", "hindi", "sanskrit"];
function isLanguageSubject(subject?: string) {
  const s = (subject || "").toLowerCase();
  return LANGUAGE_SUBJECTS.some((l) => s.includes(l));
}

export const Route = createFileRoute("/generate")({
  validateSearch: SearchSchema,
  head: () => ({ meta: [{ title: "Generated Lesson — EduPlan AI" }] }),
  component: GeneratePage,
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  atom: Atom, beaker: Beaker, leaf: Leaf, magnet: Magnet, microscope: Microscope,
  flask: FlaskConical, dna: Dna, lightbulb: Lightbulb, function: Sigma,
  circuit: Cpu, planet: Orbit, ruler: Ruler, prism: Triangle, heart: Heart,
  brain: Brain, bolt: Zap,
};

function GeneratePage() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const run = useServerFn(generateLesson);
  const requestIdRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!search.topic || search.go !== "1") return;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    run({ data: search })
      .then((r) => { if (requestIdRef.current === requestId) setResult(r as GenerationResult); })
      .catch((e) => { if (requestIdRef.current === requestId) setError(e?.message ?? String(e)); })
      .finally(() => { if (requestIdRef.current === requestId) setLoading(false); });
    // Clear the trigger without router navigation; router navigation rerenders
    // this component and cancels the in-flight server function result.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("go", "");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.go]);

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
                Filtering matching PDFs, ranking passages, and building a 10-slide lesson locally from saved NCERT text.
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
  const search = Route.useSearch();
  const genImage = useServerFn(generateSlideImage);
  const [slides, setSlides] = useState<Slide[]>(result.slides);
  const [activeIdx, setActiveIdx] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [verified, setVerified] = useState(false);
  const [images, setImages] = useState<Record<number, string>>({});
  const [imgLoading, setImgLoading] = useState<Record<number, boolean>>({});
  type ImgStatus = { state: "pending" | "loading" | "cached" | "fresh" | "failed"; error?: string; at?: number };
  const [imgStatus, setImgStatus] = useState<Record<number, ImgStatus>>({});

  useEffect(() => { setSlides(result.slides); setVerified(false); setActiveIdx(0); setImages({}); setImgLoading({}); setImgStatus({}); }, [result]);

  function updateSlide(idx: number, patch: Partial<Slide>) {
    setSlides((s) => s.map((sl, i) => (i === idx ? { ...sl, ...patch } : sl)));
  }

  async function ensureImage(idx: number, opts: { force?: boolean; cacheOnly?: boolean } = {}) {
    const { force = false, cacheOnly = false } = opts;
    if (!force && (images[idx] || imgLoading[idx])) return;
    const s = slides[idx];
    if (!s) return;
    setImgLoading((m) => ({ ...m, [idx]: true }));
    setImgStatus((m) => ({ ...m, [idx]: { state: "loading" } }));
    try {
      const r = await genImage({ data: {
        title: s.title,
        bullets: s.bullets || [],
        caption: s.caption || "",
        subject: search.subject,
        klass: search.klass,
        slideIndex: idx,
        avoidUrls: Object.entries(images).filter(([key]) => Number(key) !== idx).map(([, value]) => value),
        visual_prompt: s.visual_prompt || "",
        grounding: s.grounding || s.ncert_quote || "",
        nocache: force,
        cacheOnly,
      } });
      if (r.url) {
        setImages((m) => ({ ...m, [idx]: r.url }));
        setImgStatus((m) => ({ ...m, [idx]: { state: r.cached ? "cached" : "fresh", at: Date.now() } }));
      } else if (cacheOnly) {
        // First-pass cache miss — leave as pending so second pass generates.
        setImgStatus((m) => ({ ...m, [idx]: { state: "pending" } }));
      } else {
        setImgStatus((m) => ({ ...m, [idx]: { state: "failed", error: r.error || "no_image", at: Date.now() } }));
      }
    } catch (e) {
      console.error("slide image failed", idx, e);
      const msg = e instanceof Error ? e.message : String(e);
      setImgStatus((m) => ({ ...m, [idx]: { state: "failed", error: msg, at: Date.now() } }));
      if (!cacheOnly) toast.error("Image generation failed — will retry.");
    } finally {
      setImgLoading((m) => ({ ...m, [idx]: false }));
    }
  }


  // Auto-generate the Gemini 2D infographic for EVERY slide once verification
  // passes — regardless of subject (Physics, Chem, Bio, Math, Economics,
  // History, Geography, Political Science, and language chapters alike).
  // Results are cached in `slide_image_cache` keyed by class+subject+slide
  // metadata so repeat runs of the same lesson return instantly. We run 3
  // slides in parallel to keep the queue fast without hammering the gateway.
  useEffect(() => {
    if (!verified) return;
    let cancelled = false;
    const CONCURRENCY = 3;
    const indices = slides.map((_, i) => i);
    (async () => {
      // First pass: instant cache lookup for every slide (no API call).
      await Promise.all(indices.map((i) => ensureImage(i, { cacheOnly: true })));
      if (cancelled) return;
      // Second pass: generate fresh infographics for slides still missing one.
      let cursor = 0;
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (!cancelled) {
          const i = cursor++;
          if (i >= indices.length) return;
          // Skip slides where the first pass already populated an image.
          if (images[i]) continue;
          await ensureImage(i, { cacheOnly: false });
        }
      });
      await Promise.all(workers);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified, slides.length]);

  // Live progress indicator so the teacher can verify every subject/slide is
  // getting its 2D infographic auto-generated.
  const generatedCount = Object.values(images).filter(Boolean).length;
  const inFlightCount = Object.values(imgLoading).filter(Boolean).length;
  const cachedCount = Object.values(imgStatus).filter((s) => s.state === "cached").length;
  const freshCount = Object.values(imgStatus).filter((s) => s.state === "fresh").length;
  const failedCount = Object.values(imgStatus).filter((s) => s.state === "failed").length;

  async function retryAllFailed() {
    const failedIdxs = Object.entries(imgStatus)
      .filter(([, s]) => s.state === "failed")
      .map(([k]) => Number(k));
    for (const i of failedIdxs) {
      // eslint-disable-next-line no-await-in-loop
      await ensureImage(i, { force: true });
    }
  }




  async function downloadPDF() {
    window.print();
  }

  async function downloadPPTX() {
    try {
      const pptxgen = (await import("pptxgenjs")).default;
      const pptx = new pptxgen();
      // A4 landscape — 11.69in x 8.27in. Better for printing & smart-board display.
      pptx.defineLayout({ name: "A4_LANDSCAPE", width: 11.69, height: 8.27 });
      pptx.layout = "A4_LANDSCAPE";
      const W = 11.69, H = 8.27;
      slides.forEach((s, i) => {
        const slide = pptx.addSlide();
        slide.background = { color: "F7F8FC" };
        slide.addText(`Slide ${i + 1} / ${slides.length}`, { x: 0.3, y: 0.2, w: 4, h: 0.3, fontSize: 10, color: "8090B0", fontFace: "Calibri" });
        slide.addText(s.title || "", { x: 0.4, y: 0.55, w: W - 0.8, h: 0.85, fontSize: 26, bold: true, color: "1F2A4A", fontFace: "Calibri" });
        // Left column: bullets
        const leftW = 6.6;
        slide.addText((s.bullets || []).map((b) => ({ text: b, options: { bullet: true } })),
          { x: 0.5, y: 1.5, w: leftW, h: 3.6, fontSize: 14, color: "33415C", fontFace: "Calibri", valign: "top", paraSpaceAfter: 4 });
        // NCERT notes
        if (s.notes?.length) {
          slide.addText("NCERT Notes", { x: 0.5, y: 5.2, w: leftW, h: 0.3, fontSize: 12, bold: true, color: "1F2A4A" });
          slide.addText((s.notes).map((n) => ({ text: n, options: { bullet: { type: "number" } } })),
            { x: 0.5, y: 5.55, w: leftW, h: 1.8, fontSize: 11, color: "475569", paraSpaceAfter: 3 });
        }
        // Right column: image + key terms + quote
        const rightX = leftW + 0.7;
        const rightW = W - rightX - 0.4;
        const img = images[i];
        if (img) slide.addImage({ data: img, x: rightX, y: 1.5, w: rightW, h: 3.2 });
        if (s.key_terms?.length) {
          slide.addText("Key terms", { x: rightX, y: 4.85, w: rightW, h: 0.3, fontSize: 12, bold: true, color: "1F2A4A" });
          slide.addText(s.key_terms.map((t) => ({ text: `${t.term}: ${t.meaning}`, options: { bullet: true } })),
            { x: rightX, y: 5.2, w: rightW, h: 1.8, fontSize: 11, color: "475569", paraSpaceAfter: 3 });
        }
        if (s.ncert_quote) slide.addText(`“${s.ncert_quote}”`, { x: rightX, y: 7.1, w: rightW, h: 0.6, fontSize: 10, italic: true, color: "5A6B91" });
        if (s.caption) slide.addText(s.caption, { x: 0.5, y: 7.5, w: leftW, h: 0.4, fontSize: 10, italic: true, color: "5A6B91" });
        slide.addText("EduPlan AI · NCERT-grounded", { x: W - 3, y: H - 0.4, w: 2.8, h: 0.3, fontSize: 9, color: "8090B0", align: "right" });
      });
      await pptx.writeFile({ fileName: `${title || "lesson"}.pptx` });
    } catch (e) {
      toast.error("PPTX export failed");
      console.error(e);
    }
  }


  return (
    <>
      {/* Step 1 — Activity verification (always first) */}
      <ActivityVerification
        matches={result.activity_matches}
        activities={result.activities}
        verified={verified}
        onConfirm={() => setVerified(true)}
        onReject={() => {
          toast.message("Refine your Topic / Chapter / Subtopics and run Generate again.");
          setVerified(false);
        }}
      />

      {!verified ? (
        <p className="text-xs text-muted-foreground mt-6">
          Confirm the matched NCERT Activity above to unlock the 10-slide PPT, downloads, and 3D animated storyboard.
        </p>
      ) : (
        <>
          {/* Slides */}
          <section className="mb-10">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 print:hidden">
              <h2 className="font-semibold text-lg">10-Slide Interactive Lesson · A4 landscape (smart-board ready)</h2>
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

            {/* Live auto-gen status — proves the 2D pipeline is running for
                every subject and every slide, not just Physics. */}
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs print:hidden">
              <Badge variant="outline" className={`rounded-full ${generatedCount === slides.length ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-primary/10 text-primary border-primary/30"}`}>
                2D infographics: {generatedCount}/{slides.length} ready
                {inFlightCount > 0 ? ` · ${inFlightCount} drawing…` : ""}
              </Badge>
              <span className="text-muted-foreground">
                Auto-generated by Gemini for {result.source_books[0]?.subject || "this subject"} · cached in the library so re-runs are instant.
              </span>
            </div>

            {result.figures_report && result.figures_report.context_figures.length > 0 && (
              <div
                className={`mb-3 rounded-lg border px-3 py-2 text-xs print:hidden ${
                  result.figures_report.pass
                    ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-800"
                    : "bg-amber-500/5 border-amber-500/40 text-amber-900"
                }`}
              >
                <div className="font-semibold">
                  Figure placement {result.figures_report.pass ? "✓ verified" : "⚠ needs review"} —
                  {" "}{result.figures_report.context_figures.length} NCERT figure ref
                  {result.figures_report.context_figures.length === 1 ? "" : "s"} found in source.
                </div>
                {!result.figures_report.pass && (
                  <div className="mt-1 space-y-0.5">
                    {result.figures_report.unplaced.length > 0 && (
                      <div>Unplaced (not on any slide): {result.figures_report.unplaced.join(", ")}</div>
                    )}
                    {result.figures_report.failing_slide_indices.length > 0 && (
                      <div>
                        Slides needing a fix:{" "}
                        {result.figures_report.failing_slide_indices.map((i) => i + 1).join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}


            <div key={`slide-${activeIdx}`} className="animate-in fade-in slide-in-from-right-4 duration-500">
              <SlideCanvas
                slide={slides[activeIdx]}
                index={activeIdx}
                total={slides.length}
                editing={editing}
                onChange={(patch) => updateSlide(activeIdx, patch)}
                imageUrl={images[activeIdx]}
                imageLoading={!!imgLoading[activeIdx]}
                onRegenImage={() => { setImages((m) => { const n = { ...m }; delete n[activeIdx]; return n; }); ensureImage(activeIdx, { force: true }); }}
                subject={result.source_books[0]?.subject}
              />
            </div>

            <div className="flex items-center justify-between mt-4 print:hidden">
              <Button variant="outline" size="sm" disabled={activeIdx === 0} onClick={() => setActiveIdx((i) => i - 1)}>
                <ChevronLeft className="h-4 w-4" />Prev
              </Button>
              <div className="text-sm text-muted-foreground">{activeIdx + 1} / {slides.length}</div>
              <Button variant="outline" size="sm" disabled={activeIdx === slides.length - 1} onClick={() => setActiveIdx((i) => i + 1)}>
                Next<ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2 mt-4 print:hidden">
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

            <div className="hidden print:block">
              {slides.map((s, i) => (
                <div key={i} className="break-after-page mb-6">
                  <SlideCanvas slide={s} index={i} total={slides.length} editing={false} onChange={() => {}} imageUrl={images[i]} imageLoading={false} onRegenImage={() => {}} subject={result.source_books[0]?.subject} />
                </div>
              ))}
            </div>
          </section>

          <ActivitiesView activities={result.activities} />
          <VideoView video={result.video} />
        </>
      )}

      <p className="text-xs text-muted-foreground mt-10">
        Source: {result.source_books.map((b) => `${b.subject} · Class ${b.class} · ${b.chapter}`).join(", ")} ({result.context_chars.toLocaleString()} chars of NCERT text)
      </p>

      {presenting && (
        <PresentationMode
          slides={slides}
          images={images}
          onClose={() => setPresenting(false)}
          onNeedImage={() => {}}
          subject={result.source_books[0]?.subject}
        />
      )}
    </>
  );
}

function ActivityVerification({
  matches, activities, verified, onConfirm, onReject,
}: {
  matches: GenerationResult["activity_matches"];
  activities: GenerationResult["activities"];
  verified: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const top = matches?.[0];
  const topConfidence = top?.confidence ?? 0;
  const confidenceTone =
    topConfidence >= 70 ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
    : topConfidence >= 40 ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
    : "bg-rose-500/10 text-rose-700 border-rose-500/30";

  return (
    <section className="mb-8">
      <Card className="border-primary/30 shadow-soft">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-lg">Step 1 — Verify the matched NCERT Activity</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Confirm the activity below is the correct working before the PPT and 3D video are generated.
              </p>
            </div>
            {verified ? (
              <Badge className="rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                ✓ Verified — lesson unlocked
              </Badge>
            ) : (
              <Badge variant="outline" className={`rounded-full border ${confidenceTone}`}>
                Top confidence: {topConfidence}%
              </Badge>
            )}
          </div>

          {matches?.length ? (
            <ol className="space-y-3">
              {matches.map((m, i) => (
                <li key={`${m.book_id}:${m.chunk_index}`} className="rounded-lg border border-border/60 p-3 bg-card/40">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary" className="rounded-full">#{i + 1}</Badge>
                    {m.activity_id && <Badge className="rounded-full bg-primary/10 text-primary border-primary/30">{m.activity_id}</Badge>}
                    <span className="text-muted-foreground truncate">{m.file_name || m.chapter}</span>
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground">chunk #{m.chunk_index} · confidence {m.confidence}%</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">
                    {m.excerpt || "(no readable excerpt)"}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No explicit Activity passage detected — the proposed working guide below was synthesised from the matched chapter text.
            </p>
          )}

          {activities?.[0] && (
            <div className="mt-4 rounded-lg bg-secondary/40 p-3 text-sm">
              <div className="font-medium">Proposed working: {activities[0].name}</div>
              <div className="text-muted-foreground">{activities[0].objective}</div>
            </div>
          )}

          {!verified && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" onClick={onConfirm}>
                <Sparkles className="h-4 w-4" />Confirm — generate PPT & video
              </Button>
              <Button size="sm" variant="outline" onClick={onReject}>
                Not the right activity
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function DiagramFrame({ src, alt, mode }: { src: string; alt: string; mode: "preview" | "presentation" }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [layoutOk, setLayoutOk] = useState(true);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const check = () => {
      const box = frame.getBoundingClientRect();
      const img = frame.querySelector("img");
      if (!img || box.width === 0 || box.height === 0) return setLayoutOk(true);
      const ratioOk = Math.abs(box.width / box.height - 1414 / 1000) < 0.025;
      const padX = box.width * 0.025;
      const padY = box.height * 0.025;
      const imgBox = img.getBoundingClientRect();
      const insideSafePad = imgBox.left >= box.left + padX - 1 && imgBox.right <= box.right - padX + 1 && imgBox.top >= box.top + padY - 1 && imgBox.bottom <= box.bottom - padY + 1;
      setLayoutOk(ratioOk && insideSafePad);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [src]);

  return (
    <div
      ref={ref}
      data-diagram-frame={mode}
      data-layout-check={layoutOk ? "pass" : "adjusted"}
      className="relative w-full max-h-full aspect-[1414/1000] rounded-md overflow-hidden bg-card shadow-soft border border-border/50 p-[2.5%]"
    >
      <img src={src} alt={alt} className="w-full h-full object-contain" onLoad={() => requestAnimationFrame(() => window.dispatchEvent(new Event("resize")))} />
      {!layoutOk && <span className="absolute bottom-1 right-1 text-[9px] text-amber-700 bg-card/90 rounded px-1">safe-frame adjusted</span>}
    </div>
  );
}

function McqSlideBody({ slide }: { slide: Slide }) {
  const [reveal, setReveal] = useState(false);
  useEffect(() => { setReveal(false); }, [slide]);
  const mcq = slide.mcq;
  if (!mcq) return null;
  return (
    <div className="p-6 flex flex-col gap-3 min-h-0 overflow-auto">
      <p className="font-display text-base sm:text-lg font-semibold leading-snug">{mcq.question}</p>
      <ol className="grid sm:grid-cols-2 gap-2">
        {mcq.options.map((o) => {
          const isCorrect = reveal && o.key === mcq.answer;
          return (
            <li key={o.key}
              className={`rounded-md border p-2.5 text-sm flex gap-2 ${isCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-border/60 bg-card"}`}
            >
              <span className="font-mono font-bold">{o.key}.</span>
              <span>{o.text}</span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-2 mt-1">
        <Button size="sm" variant={reveal ? "outline" : "default"} onClick={() => setReveal((v) => !v)}>
          {reveal ? "Hide answer" : "Show answer"}
        </Button>
        {reveal && (
          <Badge className="rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
            Correct: {mcq.answer}
          </Badge>
        )}
      </div>
      {reveal && mcq.explanation && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2">{mcq.explanation}</p>
      )}
    </div>
  );
}

function ChapterSlideBody({ slide }: { slide: Slide }) {
  return (
    <div className="p-6 flex flex-col gap-2 min-h-0 overflow-auto">
      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{slide.chapter_text}</p>
      {slide.figures?.length ? (
        <p className="text-[11px] text-muted-foreground italic">Referenced NCERT figures: {slide.figures.join(", ")}</p>
      ) : null}
    </div>
  );
}

function BreakSlideBody({ slide }: { slide: Slide }) {
  return (
    <div className="p-8 grid place-items-center text-center gap-3">
      <div className="text-4xl">☕</div>
      <h3 className="font-display text-2xl font-bold">Break Time</h3>
      <p className="text-sm text-muted-foreground max-w-md">{slide.caption}</p>
      <ul className="text-sm space-y-1">
        {(slide.bullets || []).map((b, i) => <li key={i}>• {b}</li>)}
      </ul>
    </div>
  );
}

function SlideCanvas({
  slide, index, total, editing, onChange, imageUrl, imageLoading, onRegenImage, subject,
}: {
  slide: Slide; index: number; total: number; editing: boolean; onChange: (p: Partial<Slide>) => void;
  imageUrl?: string; imageLoading?: boolean; onRegenImage?: () => void; subject?: string;
}) {
  if (!slide) return null;
  const kind = slide.kind || "content";
  const lang = isLanguageSubject(subject);
  const v = slide.verification;
  const vTone = !v ? "" :
    v.coverage >= 80 ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" :
    v.coverage >= 55 ? "bg-amber-500/10 text-amber-700 border-amber-500/30" :
    "bg-rose-500/10 text-rose-700 border-rose-500/30";

  // Break / MCQ / chapter slides use single-column layout.
  if (kind === "break" || kind === "mcq" || kind === "chapter") {
    return (
      <Card className="overflow-hidden border-border/60 shadow-soft">
        <CardContent className="p-0">
          <div className="relative w-full aspect-[297/210] overflow-hidden bg-card grid grid-rows-[auto_1fr_auto]">
            <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-border/60 bg-secondary/40 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-mono">Slide {index + 1} / {total}</span>
              <Badge variant="outline" className={`rounded-full text-[10px] ${kind === "mcq" ? "bg-primary/10 text-primary border-primary/30" : kind === "break" ? "bg-amber-500/10 text-amber-700 border-amber-500/30" : "bg-sky-500/10 text-sky-700 border-sky-500/30"}`}>
                {kind === "mcq" ? "MCQ" : kind === "break" ? "Break" : "Chapter page"}
              </Badge>
            </div>
            <div className="min-h-0 overflow-hidden">
              <h3 className="px-6 pt-3 font-display text-lg sm:text-xl font-bold tracking-tight leading-tight line-clamp-2">{slide.title}</h3>
              {kind === "mcq" && <McqSlideBody slide={slide} />}
              {kind === "chapter" && <ChapterSlideBody slide={slide} />}
              {kind === "break" && <BreakSlideBody slide={slide} />}
            </div>
            <div className="px-4 sm:px-6 py-2 border-t border-border/60 bg-secondary/40 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="truncate max-w-[70%] italic">{slide.caption || slide.title}</span>
              <span className="font-mono shrink-0">EduPlan AI · A4</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/60 shadow-soft">
      <CardContent className="p-0">
        <div className="relative w-full aspect-[297/210] overflow-hidden bg-card grid grid-rows-[auto_1fr_auto]">
          <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-border/60 bg-secondary/40 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="font-mono">Slide {index + 1} / {total}</span>
            <div className="flex items-center gap-2">
              {v && (
                <Badge variant="outline" className={`rounded-full text-[10px] ${vTone}`}>
                  Notes {v.coverage}% · Diagram {v.diagram_match}% · Labels {v.diagram_label_fit}
                </Badge>
              )}
              {v?.figures_check && (v.figures_check.expected.length > 0 || v.figures_check.placed.length > 0) && (
                <Badge
                  variant="outline"
                  className={`rounded-full text-[10px] ${v.figures_check.pass ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-rose-500/10 text-rose-700 border-rose-500/30"}`}
                  title={
                    v.figures_check.pass
                      ? `Figures OK: ${v.figures_check.correct.join(", ") || "none"}`
                      : `Swapped: ${v.figures_check.swapped.join(", ") || "—"} · Missing: ${v.figures_check.missing.join(", ") || "—"}`
                  }
                >
                  Figures {v.figures_check.pass ? "✓" : "⚠"} {v.figures_check.correct.length}/{v.figures_check.expected.length}
                </Badge>
              )}
              <Badge variant="outline" className="rounded-full text-[10px]">
                {v?.overall_pass ? "NCERT ✓ verified" : "NCERT-grounded"}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-[1.35fr_1fr] min-h-0 overflow-hidden">
            <div className="p-4 sm:p-5 flex flex-col gap-2 min-h-0 overflow-auto">
              {editing ? (
                <Input
                  value={slide.title}
                  onChange={(e) => onChange({ title: e.target.value })}
                  className="font-display text-lg sm:text-xl font-bold border-0 px-0 shadow-none focus-visible:ring-0 h-auto"
                />
              ) : (
                <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight leading-tight">{slide.title}</h3>
              )}
              <ul className="space-y-1">
                {(slide.bullets || []).map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
                    {editing ? (
                      <Textarea
                        value={b}
                        onChange={(e) => {
                          const next = [...slide.bullets];
                          next[i] = e.target.value;
                          onChange({ bullets: next });
                        }}
                        className="min-h-[32px] resize-none text-xs"
                      />
                    ) : (
                      <p className="text-[12px] leading-snug">{b}</p>
                    )}
                  </li>
                ))}
              </ul>
              {slide.notes?.length ? (
                <div className="rounded-md bg-secondary/50 border border-border/50 p-2 overflow-hidden">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-primary mb-1">NCERT notes</div>
                  <ol className="space-y-0.5 list-decimal list-inside text-[11px] leading-snug text-foreground/85">
                    {slide.notes.map((n, i) => <li key={i}>{n}</li>)}
                  </ol>
                </div>
              ) : null}
              {slide.key_terms?.length ? (
                <div className="rounded-md bg-accent/20 border border-border/50 p-2 overflow-hidden">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-primary mb-1">Key terms</div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] leading-snug">
                    {slide.key_terms.map((t, i) => (
                      <div key={i}><dt className="font-semibold inline">{t.term}: </dt><dd className="inline text-muted-foreground">{t.meaning}</dd></div>
                    ))}
                  </dl>
                </div>
              ) : null}
              {editing && (
                <Input
                  value={slide.caption ?? ""}
                  placeholder="Caption (optional)"
                  onChange={(e) => onChange({ caption: e.target.value })}
                  className="text-[11px] h-8"
                />
              )}
              {slide.figures?.length ? (
                <p className="text-[10px] text-muted-foreground">📖 Refer NCERT {slide.figures.join(", ")}</p>
              ) : null}
              {slide.ncert_quote ? (
                <p className="text-[10px] italic text-muted-foreground border-l-2 border-primary/40 pl-2 line-clamp-2">“{slide.ncert_quote}”</p>
              ) : null}
            </div>
            <div className="relative bg-gradient-to-br from-primary/10 via-secondary to-accent/30 flex flex-col p-3 border-l border-border/60 overflow-hidden gap-2 min-h-0">
              <div className="absolute top-2 left-2 z-10 text-[9px] font-mono text-muted-foreground bg-card/80 rounded px-1.5 py-0.5 border border-border/40">2D infographic · Gemini</div>
              <div className="relative w-full flex-[3] rounded-md overflow-hidden bg-card shadow-soft border border-border/50 min-h-0 grid place-items-center">
                {imageUrl ? (
                  <img src={imageUrl} alt={`${slide.title} — NCERT 2D infographic`} className="w-full h-full object-contain" />
                ) : imageLoading ? (
                  <div className="flex flex-col items-center gap-2 text-[10px] text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    Drawing 2D infographic from NCERT notes…
                  </div>
                ) : (
                  <button onClick={onRegenImage} className="flex flex-col items-center gap-1 text-[10px] text-primary underline hover:no-underline">
                    <span>Retry 2D infographic</span>
                    <span className="text-muted-foreground no-underline">(Gemini · auto-cached)</span>
                  </button>
                )}
              </div>
              {/* Hide the 3D / simulation panel entirely for language subjects. */}
              {!lang && (
                <div className="relative w-full flex-[2] rounded-md overflow-hidden bg-card shadow-soft border border-border/50 min-h-0">
                  <div className="absolute top-1 left-1 z-10 text-[9px] font-mono text-muted-foreground bg-card/80 rounded px-1.5 py-0.5 border border-border/40">Live simulation</div>
                  <SimPanel slide={slide} index={index} subject={subject} editable />
                </div>
              )}
            </div>
          </div>

          <div className="px-4 sm:px-6 py-2 border-t border-border/60 bg-secondary/40 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="truncate max-w-[70%] italic">{slide.caption || `NCERT-grounded summary — ${slide.title}`}</span>
            <span className="font-mono shrink-0">EduPlan AI · A4</span>
          </div>
        </div>

        {v && v.missing.length > 0 && (
          <div className="px-4 py-2 border-t border-border/60 text-[11px] text-muted-foreground print:hidden">
            <span className="font-semibold text-rose-700">Flagged as not directly matched in NCERT text:</span>{" "}
            {v.missing.map((m, i) => <span key={i} className="italic">“{m}”{i < v.missing.length - 1 ? "; " : ""}</span>)}
          </div>
        )}
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

function PresentationMode({ slides, images, onClose, onNeedImage, subject }: { slides: Slide[]; images: Record<number, string>; onClose: () => void; onNeedImage: (idx: number) => void; subject?: string }) {
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

  // Auto-generate the free local 2D SVG for the active slide (and next one, prefetch)
  useEffect(() => {
    if (!images[i]) onNeedImage(i);
  }, [i, images, onNeedImage, slides.length]);

  const s = slides[i];
  const Icon = ICONS[(s?.visual || "atom").toLowerCase()] ?? Atom;
  const img = images[i];
  return (
    <div className="fixed inset-0 z-50 bg-foreground text-background flex flex-col overflow-hidden">
      {/* Top bar (fixed) */}
      <div className="shrink-0 flex items-center justify-between px-5 py-2 border-b border-background/10 text-xs">
        <div className="flex items-center gap-2 opacity-70 font-mono">
          <Icon className="h-4 w-4" /> Slide {i + 1} / {slides.length}
        </div>
        <button onClick={onClose} className="opacity-70 hover:opacity-100">Exit ✕</button>
      </div>

      {/* A4 landscape frame that scales to fit — no scroll */}
      <div className="flex-1 min-h-0 grid place-items-center p-3 sm:p-5">
        <div
          key={`present-${i}`}
          className="w-full h-full max-w-[min(100%,calc(100vh*1.414))] max-h-[min(100%,calc(100vw/1.414))] aspect-[297/210] bg-background text-foreground rounded-xl shadow-2xl grid grid-rows-[auto_1fr_auto] overflow-hidden animate-in fade-in slide-in-from-right-6 duration-500"
        >
          {/* Slide header */}
          <div className="px-6 pt-4 pb-2 border-b border-border/40">
            <h2 className="font-display text-[clamp(18px,2.6vw,34px)] font-extrabold leading-tight line-clamp-2">
              {s.title}
            </h2>
          </div>

          {/* Body: text left, diagram right — both clipped to A4 area */}
          <div className="grid grid-cols-[1.35fr_1fr] min-h-0 overflow-hidden">
            <div className="p-5 min-h-0 overflow-auto flex flex-col gap-2">
              {s.kind === "chapter" && s.chapter_text ? (
                <p className="text-[clamp(11px,1.05vw,15px)] leading-relaxed whitespace-pre-wrap">
                  {s.chapter_text}
                </p>
              ) : (
                <>
                  <ul className="space-y-1.5">
                    {(s.bullets || []).map((b, k) => (
                      <li key={k} className="flex gap-2 text-[clamp(11px,1.1vw,15px)] leading-snug">
                        <span className="opacity-50 shrink-0">{k + 1}.</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  {s.notes?.length ? (
                    <div className="rounded-md bg-secondary/60 border border-border/40 p-2">
                      <div className="text-[9px] font-semibold uppercase tracking-wider opacity-70 mb-1">NCERT notes</div>
                      <ol className="space-y-0.5 list-decimal list-inside text-[clamp(10px,0.95vw,13px)] leading-snug">
                        {s.notes.map((n, k) => <li key={k}>{n}</li>)}
                      </ol>
                    </div>
                  ) : null}
                  {s.key_terms?.length ? (
                    <div className="text-[clamp(10px,0.95vw,13px)] leading-snug space-y-0.5">
                      {s.key_terms.map((t, k) => (
                        <div key={k}><span className="font-semibold">{t.term}:</span> <span className="opacity-80">{t.meaning}</span></div>
                      ))}
                    </div>
                  ) : null}
                  {s.ncert_quote && (
                    <p className="italic opacity-70 border-l-2 border-primary/40 pl-2 text-[clamp(10px,0.9vw,12px)]">"{s.ncert_quote}"</p>
                  )}
                </>
              )}
            </div>

            {/* Diagram column — Gemini 2D infographic + live sim */}
            <div className="border-l border-border/40 bg-gradient-to-br from-primary/10 via-secondary/40 to-accent/20 flex flex-col p-3 min-h-0 overflow-hidden gap-2">
              <div className="relative w-full flex-[3] min-h-0 rounded-md bg-background/80 border border-border/40 overflow-hidden grid place-items-center">
                {img ? (
                  <img src={img} alt={`${s.title} — NCERT 2D infographic`} className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[10px] text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    Drawing 2D infographic…
                  </div>
                )}
              </div>
              <div className="relative w-full flex-[2] min-h-0 rounded-md bg-background/80 border border-border/40 overflow-hidden">
                <SimPanel slide={s} index={i} subject={subject} />
              </div>
              {s.caption && (
                <p className="text-[clamp(9px,0.85vw,11px)] italic text-muted-foreground text-center line-clamp-1">{s.caption}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="italic truncate max-w-[70%]">NCERT-grounded · {s.title}</span>
            <span className="font-mono">EduPlan AI · A4</span>
          </div>
        </div>
      </div>

      {/* Bottom controls (fixed) */}
      <div className="shrink-0 flex items-center justify-between px-5 py-2 border-t border-background/10 text-xs">
        <div className="opacity-60 font-mono">← → to navigate · Esc to exit</div>
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

/**
 * Resolves auto-picked simulations for a slide, layers any per-slide
 * teacher overrides on top (persisted via useSimOverride), and — when
 * `editable` — exposes the reorder/add/remove popover.
 */
function SimPanel({ slide, index, subject, editable }: { slide: Slide; index: number; subject?: string; editable?: boolean }) {
  const auto = useMemo(
    () => pickSimulations(
      [slide.title, ...(slide.bullets || []), ...(slide.notes || [])].join(" "),
      subject,
      3,
    ),
    [slide, subject],
  );
  const key = slideKey(subject, index, slide.title || "");
  const { sims, isOverridden, save, reset } = useSimOverride(key, auto);
  return (
    <div className="relative w-full h-full">
      {editable && (
        <SimulationOverrideEditor
          sims={sims}
          onChange={save}
          onReset={reset}
          isOverridden={isOverridden}
        />
      )}
      <SimulationViewer sims={sims} />
    </div>
  );
}
