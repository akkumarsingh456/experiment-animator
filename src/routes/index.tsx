import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduPlan AI — NCERT Experiments, Animated for Class 9–12" },
      { name: "description", content: "Upload any NCERT chapter. Get cinematic 3D animated experiment videos with narration, perfectly aligned to NEP and Class 9–12 syllabus." },
    ],
  }),
  component: Landing,
});

const classes = ["Class 9", "Class 10", "Class 11", "Class 12"];

const subjects = [
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

const features = [
  "Anchored to NCERT 'Activity' numbering",
  "Aligned with NEP 2020 outcomes",
  "Safety gear shown in every lab scene",
  "Vertical & 16:9 aspect ratios",
  "Hindi & English voiceover support",
  "Downloadable scene-by-scene JSON",
];

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
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#subjects" className="hover:text-foreground transition">Subjects</a>
            <a href="#features" className="hover:text-foreground transition">Features</a>
          </nav>
          <Button size="sm" className="rounded-full">Get started</Button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-paper opacity-60 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-5 pt-20 pb-24 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="rounded-full px-3 py-1 mb-6 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Built for NCERT • Class 9–12
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">
              Every NCERT experiment,{" "}
              <span className="text-primary">animated to life.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Upload a chapter PDF. EduPlan AI extracts every <span className="font-semibold text-foreground">Activity</span>,
              writes the storyboard, and renders a cinematic 3D video — complete with narration,
              labels, and a microscopic zoom-in that explains the <em>why</em>.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="rounded-full h-12 px-7 shadow-glow">
                <Upload className="h-4 w-4" />
                Upload your NCERT chapter
              </Button>
              <Button size="lg" variant="outline" className="rounded-full h-12 px-7">
                <PlayCircle className="h-4 w-4" />
                Watch a sample
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 justify-center">
              {classes.map((c) => (
                <Badge key={c} variant="outline" className="rounded-full bg-card/60">
                  {c}
                </Badge>
              ))}
            </div>
          </div>

          {/* Mock preview card */}
          <div className="mt-16 max-w-4xl mx-auto">
            <Card className="overflow-hidden border-border/60 shadow-soft">
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-secondary via-card to-accent/30 relative grid place-items-center">
                  <div className="absolute top-4 left-4 flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-accent" />
                    <div className="h-2.5 w-2.5 rounded-full bg-chemistry/70" />
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-background/80 text-foreground border border-border">
                      Activity 1.1 • Class 10 Chemistry
                    </Badge>
                  </div>
                  <div className="text-center px-6">
                    <div className="h-20 w-20 mx-auto rounded-full bg-primary/90 text-primary-foreground grid place-items-center shadow-glow">
                      <PlayCircle className="h-10 w-10" />
                    </div>
                    <p className="mt-5 text-sm text-muted-foreground max-w-md mx-auto">
                      Scene 3 of 5 — "Magnesium ribbon burns with a dazzling white flame in air"
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 border-t border-border/60 text-xs">
                  {["Apparatus", "Reaction", "Observation", "Zoom-in", "Conclusion"].map((s, i) => (
                    <div
                      key={s}
                      className={`p-3 text-center font-medium border-r border-border/60 last:border-r-0 ${
                        i === 2 ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
            {subjects.map((s) => (
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

      {/* FEATURES */}
      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-5 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="secondary" className="rounded-full mb-4">
              <BookOpen className="h-3.5 w-3.5" />
              NEP 2020 ready
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
              Designed for Indian classrooms, not generic AI.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              EduPlan AI anchors on the exact phrasing NCERT uses — every "Activity 1.1" becomes a
              standalone, syllabus-perfect video. Safety gear, lab settings, and conceptual zoom-ins
              are non-negotiable defaults.
            </p>
            <ul className="mt-6 grid sm:grid-cols-2 gap-3">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="border-border/60 shadow-soft overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-foreground text-background p-5 font-mono text-xs leading-relaxed overflow-x-auto">
                <div className="text-accent">// AI Storyboard output</div>
                <div className="mt-2">{`{`}</div>
                <div className="pl-4">"activity_id": "Class 10 • Activity 1.1",</div>
                <div className="pl-4">"objective": "Observe chemical change in burning Mg ribbon",</div>
                <div className="pl-4">"scenes": [</div>
                <div className="pl-8">{`{ "title": "Apparatus", "duration": "4s" },`}</div>
                <div className="pl-8">{`{ "title": "Ignition",  "duration": "5s" },`}</div>
                <div className="pl-8 text-primary">{`{ "title": "Zoom-in: MgO bond formation" }`}</div>
                <div className="pl-4">]</div>
                <div>{`}`}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight">
            Ready to bring your textbook to life?
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Free for the first 10 activities. No card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="rounded-full h-12 px-8 shadow-glow">
              <Upload className="h-4 w-4" />
              Upload NCERT PDF
            </Button>
            <Button size="lg" variant="outline" className="rounded-full h-12 px-8">
              See a live sample
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 py-8">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-semibold text-foreground">EduPlan AI</span>
          </div>
          <p>© 2026 EduPlan AI • Made for Class 9–12 learners in India</p>
        </div>
      </footer>
    </div>
  );
}
