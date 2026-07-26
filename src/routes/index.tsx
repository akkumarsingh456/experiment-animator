import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Upload,
  Wand2,
  Film,
  FlaskConical,
  Atom,
  Leaf,
  Sigma,
  GraduationCap,
  PlayCircle,
  CheckCircle2,
  BookOpen,
  Search,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { listChapters, listSubtopics } from "@/lib/catalog.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduPlan AI — NCERT Experiments, Animated for Class 9–12" },
      { name: "description", content: "Search any NCERT topic. Get a 10-slide editable lesson and a 3D animated experiment video for Class 9–12." },
    ],
  }),
  component: Landing,
});

const CLASSES = ["9", "10", "11", "12"];
const SUBJECTS = ["Physics", "Chemistry", "Biology", "Mathematics", "Science", "Economics", "History", "Geography", "English", "Hindi"];

const subjectCards = [
  { name: "Chemistry", icon: FlaskConical, color: "var(--chemistry)", desc: "Reactions, bonds & molecular zoom-ins" },
  { name: "Physics", icon: Atom, color: "var(--physics)", desc: "Light rays, circuits & field lines" },
  { name: "Biology", icon: Leaf, color: "var(--biology)", desc: "Cells, osmosis & enzyme action" },
  { name: "Mathematics", icon: Sigma, color: "var(--math)", desc: "Geometric proofs visualized" },
];

const steps = [
  { icon: Upload, title: "Upload NCERT Chapter", desc: "Drop a PDF — we detect every Activity 1.1, 2.3 and so on automatically." },
  { icon: Wand2, title: "AI Builds the Storyboard", desc: "4–6 scenes per experiment with apparatus, voiceover & on-screen labels." },
  { icon: Film, title: "Render Cinematic Video", desc: "Realistic 3D lab footage plus a microscopic zoom-in for the concept." },
  { icon: PlayCircle, title: "Learn & Share", desc: "Stream in class, download MP4, or share a link with classmates." },
];

const LANGUAGE_SUBJECTS = ["English", "Hindi", "Sanskrit"];
function isLang(s: string) { return LANGUAGE_SUBJECTS.includes(s); }

function GeneratorBlock() {
  const nav = useNavigate();
  const fetchChapters = useServerFn(listChapters);
  const fetchSubtopics = useServerFn(listSubtopics);

  const [topic, setTopic] = useState("");
  const [klass, setKlass] = useState("10");
  const [subject, setSubject] = useState("Science");
  const [chapter, setChapter] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const lang = isLang(subject);

  const [chapters, setChapters] = useState<Array<{ label: string; raw: string }>>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  const [subOptions, setSubOptions] = useState<string[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [customSub, setCustomSub] = useState("");

  // Fetch chapter list when class/subject changes.
  useEffect(() => {
    let cancelled = false;
    setChaptersLoading(true);
    setChapters([]);
    setTopic("");
    setChapter("");
    setSelectedSubs([]);
    setSubOptions([]);
    fetchChapters({ data: { klass, subject } })
      .then((r) => { if (!cancelled) setChapters(r.chapters || []); })
      .catch(() => { if (!cancelled) setChapters([]); })
      .finally(() => { if (!cancelled) setChaptersLoading(false); });
    return () => { cancelled = true; };
  }, [klass, subject, fetchChapters]);

  // Fetch subtopic suggestions when chapter/topic changes (non-language mode).
  useEffect(() => {
    if (lang) return;
    let cancelled = false;
    setSubLoading(true);
    setSubOptions([]);
    setSelectedSubs([]);
    const key = chapter || topic;
    fetchSubtopics({ data: { klass, subject, chapter: key } })
      .then((r) => { if (!cancelled) setSubOptions(r.subtopics || []); })
      .catch(() => { if (!cancelled) setSubOptions([]); })
      .finally(() => { if (!cancelled) setSubLoading(false); });
    return () => { cancelled = true; };
  }, [klass, subject, chapter, topic, lang, fetchSubtopics]);

  const finalTopic = useMemo(() => {
    if (lang) return (chapter || customTopic).trim();
    return (topic || customTopic).trim();
  }, [lang, topic, chapter, customTopic]);

  function toggleSub(v: string) {
    setSelectedSubs((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }
  function addCustomSub() {
    const v = customSub.trim();
    if (!v) return;
    if (!selectedSubs.includes(v)) setSelectedSubs((prev) => [...prev, v]);
    setCustomSub("");
  }

  function go() {
    if (!finalTopic) return;
    nav({
      to: "/generate",
      search: {
        topic: finalTopic,
        subtopics: lang ? "" : selectedSubs.join(", "),
        klass,
        subject,
        chapter: lang ? finalTopic : chapter || customTopic,
        mode: lang ? "chapter" : "topic",
        go: "1",
      },
    });
  }

  return (
    <Card className="border-border/60 shadow-soft overflow-hidden">
      <CardContent className="p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
            <Search className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-lg leading-tight">Advanced NCERT Topic Generator</h3>
            <p className="text-xs text-muted-foreground">
              {lang
                ? "Language mode · full chapter, verbatim NCERT text with break slides + MCQs"
                : "RAG-filtered to your exact Class · Subject · Chapter, with 10 MCQs at the end"}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Class</label>
            <Select value={klass} onValueChange={setKlass}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLASSES.map((c) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Chapter dropdown — populated from uploaded NCERT library */}
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              Chapter {chaptersLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              <span className="text-[10px] text-muted-foreground/70">
                ({chapters.length} available for Class {klass} · {subject})
              </span>
            </label>
            {chapters.length > 0 ? (
              <Select value={chapter} onValueChange={setChapter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a chapter from your library" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {chapters.map((c) => (
                    <SelectItem key={c.raw} value={c.label}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder={chaptersLoading ? "Loading chapters…" : "No chapters — type a chapter name"}
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                className="mt-1"
              />
            )}
          </div>

          {!lang && (
            <>
              {/* Topic — either auto-filled from chapter or custom */}
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Topic name</label>
                <Input
                  placeholder={chapter ? chapter : 'e.g. "Acids, Bases and Salts" or "Electromagnetic Induction"'}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="mt-1"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Leave blank to use the chapter name as the topic.
                </p>
              </div>

              {/* Subtopics — multi-select checkboxes */}
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  Subtopics {subLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span className="text-[10px] text-muted-foreground/70">
                    (tick to include · {selectedSubs.length} selected)
                  </span>
                </label>
                {subOptions.length > 0 ? (
                  <ScrollArea className="mt-1 h-40 rounded-md border border-border/60 bg-card/50 p-3">
                    <div className="grid sm:grid-cols-2 gap-2">
                      {subOptions.map((s) => {
                        const checked = selectedSubs.includes(s);
                        return (
                          <label
                            key={s}
                            className={`flex items-start gap-2 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors ${
                              checked ? "bg-primary/10" : "hover:bg-muted/40"
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleSub(s)}
                              className="mt-0.5"
                            />
                            <span className="leading-snug">{s}</span>
                          </label>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground italic">
                    {subLoading ? "Scanning NCERT chunks…" : "No subtopic headings detected — add your own below."}
                  </p>
                )}

                {/* Custom subtopic add */}
                <div className="mt-2 flex gap-2">
                  <Input
                    placeholder="Add custom subtopic and press +"
                    value={customSub}
                    onChange={(e) => setCustomSub(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSub(); } }}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addCustomSub}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {selectedSubs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedSubs.map((s) => (
                      <Badge key={s} variant="secondary" className="rounded-full gap-1 pr-1">
                        {s}
                        <button
                          type="button"
                          onClick={() => toggleSub(s)}
                          className="ml-1 rounded-full hover:bg-background/60 p-0.5"
                          aria-label={`Remove ${s}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {lang && (
            <div className="sm:col-span-2">
              <p className="text-[11px] text-muted-foreground">
                The full chapter text will be presented verbatim in 10-page batches with a break slide between batches.
              </p>
            </div>
          )}
        </div>

        <Button
          onClick={go}
          disabled={!finalTopic}
          size="lg"
          className="w-full mt-5 rounded-xl h-12 shadow-glow"
        >
          <Wand2 className="h-4 w-4" />
          {lang ? "Generate full chapter PPT + MCQs" : "Generate Lesson & 3D Experiment"}
        </Button>

        <p className="mt-3 text-xs text-muted-foreground text-center">
          The AI strictly reads only the matching NCERT PDF you uploaded — every other file is skipped.
        </p>
      </CardContent>
    </Card>
  );
}

function Landing() {
  return (
    <div className="min-h-screen">
      {/* NAV */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/60">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-soft">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-display font-extrabold text-lg tracking-tight">EduPlan AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <a href="#generator" className="hover:text-foreground transition">Generate</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <Link to="/upload" className="hover:text-foreground transition">Upload</Link>
            <Link to="/history" className="hover:text-foreground transition">Library</Link>
          </nav>
          <Button asChild size="sm" className="rounded-full"><Link to="/upload">Upload NCERT PDF</Link></Button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-paper opacity-60 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-5 pt-16 pb-10 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="rounded-full px-3 py-1 mb-6 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Built for NCERT • Class 9–12
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">
              Every NCERT topic,{" "}
              <span className="text-primary">a 10-slide lesson + 3D experiment.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Search any concept. The AI reads only the matching NCERT chapter you uploaded and
              builds an editable presentation plus a cinematic 3D animated activity video.
            </p>
          </div>

          {/* GENERATOR */}
          <div id="generator" className="mt-10 max-w-3xl mx-auto">
            <GeneratorBlock />
          </div>

          <div className="mt-8 flex flex-wrap gap-2 justify-center">
            {CLASSES.map((c) => (
              <Badge key={c} variant="outline" className="rounded-full bg-card/60">Class {c}</Badge>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">From PDF to playable in minutes</h2>
            <p className="mt-3 text-muted-foreground">
              Our pipeline reads NCERT the way teachers do — then turns it into a visual lesson.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((s, i) => (
              <Card key={s.title} className="border-border/60 shadow-soft hover:shadow-glow transition-shadow">
                <CardContent className="p-6">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center mb-4">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">STEP {i + 1}</div>
                  <h3 className="font-semibold text-lg">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SUBJECTS */}
      <section id="subjects" className="py-20 bg-card/40 border-y border-border/60">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">Every subject. Every activity.</h2>
            <p className="mt-3 text-muted-foreground">
              Tailored visual language per stream — because a titration shouldn't look like a circuit.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {subjectCards.map((s) => (
              <Card key={s.name} className="border-border/60 group hover:-translate-y-1 transition-transform">
                <CardContent className="p-6">
                  <div
                    className="h-12 w-12 rounded-2xl grid place-items-center mb-4 text-white"
                    style={{ backgroundColor: `oklch(from ${s.color} l c h)` }}
                  >
                    <s.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-lg">{s.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight">
            Ready to bring your textbook to life?
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Upload your chapter once. Generate unlimited lessons and 3D experiments.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="rounded-full h-12 px-8 shadow-glow">
              <Link to="/upload"><Upload className="h-4 w-4" />Upload NCERT PDF</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-8">
              <a href="#generator"><CheckCircle2 className="h-4 w-4" />Try the Generator</a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-semibold text-foreground">EduPlan AI</span>
          </div>
          <p>© 2026 EduPlan AI • Made for Class 9–12 learners in India</p>
          <Badge variant="secondary" className="rounded-full"><BookOpen className="h-3.5 w-3.5" />NEP 2020 ready</Badge>
        </div>
      </footer>
    </div>
  );
}
