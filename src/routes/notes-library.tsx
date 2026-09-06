import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  ListPlus,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
} from "lucide-react";

import { SYLLABUS_CLASSES, subjectsForClass } from "@/lib/ncert-syllabus";
import {
  buildStatus,
  controlBuild,
  enqueueLibrary,
  listBuiltChapters,
  runBuildBatch,
  type BuildStatus,
} from "@/lib/library-build.functions";

export const Route = createFileRoute("/notes-library")({
  head: () => ({
    meta: [
      { title: "Notes Library — Build Every NCERT Chapter | EduPlan AI" },
      {
        name: "description",
        content:
          "Queue and build Teacher Notes for every NCERT chapter of Class 9–12, then open any saved chapter instantly.",
      },
      { property: "og:title", content: "Notes Library — Build Every NCERT Chapter" },
      {
        property: "og:description",
        content: "Build, pause and resume Teacher Notes for all Class 9–12 NCERT chapters, saved forever.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotesLibrary;
});

function NotesLibrary() {
  const getStatus = useServerFn(buildStatus);
  const queueAll = useServerFn(enqueueLibrary);
  const control = useServerFn(controlBuild);
  const runBatch = useServerFn(runBuildBatch);
  const getBuilt = useServerFn(listBuiltChapters);

  const [status, setStatus] = useState<BuildStatus | null>(null);
  const [built, setBuilt] = useState<Awaited<ReturnType<typeof listBuiltChapters>>["chapters"]>([]);
  const [busy, setBusy] = useState(false);
  const [klass, setKlass] = useState("all");
  const [subject, setSubject] = useState("all");
  const loopRef = useRef(false);

  const refresh = useCallback(async () => {
    const [st, bt] = await Promise.all([
      getStatus({ data: { klass: klass === "all" ? "" : klass } }),
      getBuilt({ data: { klass: klass === "all" ? "" : klass, subject: subject === "all" ? "" : subject } }),
    ]);
    setStatus(st);
    setBuilt(bt.chapters);
    return st;
  }, [getStatus, getBuilt, klass, subject]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Drive the queue while it is running: one small batch at a time, sequential.
  useEffect(() => {
    if (!status || status.state !== "running" || loopRef.current) return;
    loopRef.current = true;
    let stop = false;
    (async () => {
      while (!stop) {
        const res = await runBatch({ data: { limit: 1 } });
        const st = await refresh();
        if (st.state !== "running") break;
        if (!res || res.ran === 0) {
          if (res?.reason === "locked") await new Promise((r) => setTimeout(r, 5000));
          else break;
        }
        await new Promise((r) => setTimeout(r, 1200));
      }
      loopRef.current = false;
    })();
    return () => {
      stop = true;
    };
  }, [status?.state, runBatch, refresh]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const counts = status?.counts ?? { pending: 0, running: 0, done: 0, failed: 0, total: 0 };
  const pct = counts.total ? Math.round((counts.done / counts.total) * 100) : 0;
  const subjects = klass === "all" ? [] : subjectsForClass(klass);

  return (
    <div className="min-h-screen grid-paper">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            <span className="font-semibold">EduPlan AI</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/upload" className="hover:text-foreground transition">Upload</Link>
            <Link to="/history" className="hover:text-foreground transition">Ingestion</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Notes Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build Teacher Notes chapter by chapter for Class 9–12. Progress is saved, so you can pause any
            time and pick up exactly where you left off.
          </p>
        </div>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={klass} onValueChange={(v) => { setKlass(v); setSubject("all"); }}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {SYLLABUS_CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>Class {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={subject} onValueChange={setSubject} disabled={klass === "all"}>
                <SelectTrigger className="w-52"><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  act(() =>
                    queueAll({
                      data: {
                        klass: klass === "all" ? "" : klass,
                        subject: subject === "all" ? "" : subject,
                      },
                    }),
                  )
                }
              >
                <ListPlus className="h-4 w-4" />
                Add chapters to queue
              </Button>

              {status?.state === "running" ? (
                <Button disabled={busy} onClick={() => act(() => control({ data: { action: "pause" } }))}>
                  <Pause className="h-4 w-4" /> Pause build
                </Button>
              ) : (
                <Button disabled={busy} onClick={() => act(() => control({ data: { action: "start" } }))}>
                  <Play className="h-4 w-4" /> Start build
                </Button>
              )}

              {counts.failed > 0 && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => act(() => control({ data: { action: "retry_failed" } }))}
                >
                  <RotateCcw className="h-4 w-4" /> Retry {counts.failed} failed
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{counts.done} saved</Badge>
                <Badge variant="outline">{counts.pending} waiting</Badge>
                {counts.failed > 0 && <Badge variant="destructive">{counts.failed} failed</Badge>}
                <span className="text-muted-foreground">of {counts.total} chapters ({pct}%)</span>
                {status?.state === "running" && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> building…
                  </span>
                )}
              </div>
              {status?.state === "blocked" && (
                <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Build stopped: {status.message || "the AI service refused the request."} Fix that, then press Start build again.</span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Saved chapters ({built.length})
            </h2>
            {built.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing saved yet. Add chapters to the queue and press Start build.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {built.map((b) => (
                  <li key={`${b.klass}-${b.subject}-${b.chapter}`} className="flex flex-wrap items-center gap-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">{b.chapter}</span>
                    <Badge variant="outline">Class {b.klass}</Badge>
                    <Badge variant="secondary">{b.subject}</Badge>
                    <span className="text-xs text-muted-foreground">{b.slides} slides</span>
                    <Button asChild size="sm" variant="ghost" className="ml-auto">
                      <Link
                        to="/generate"
                        search={{
                          topic: b.chapter,
                          subtopics: b.subtopics,
                          klass: b.klass,
                          subject: b.subject,
                          chapter: b.chapter,
                          mode: "chapter" as const,
                          go: "1",
                        }}
                      >
                        Open notes
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {status && status.recent.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h2 className="text-lg font-semibold mb-3">Recent activity</h2>
              <ul className="space-y-1 text-sm">
                {status.recent.slice(0, 25).map((r) => (
                  <li key={`${r.klass}-${r.subject}-${r.chapter}`} className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-xs w-36 shrink-0">
                      {new Date(r.updated_at).toLocaleString()}
                    </span>
                    <Badge variant={r.status === "done" ? "secondary" : r.status === "failed" ? "destructive" : "outline"}>
                      {r.status}
                    </Badge>
                    <span>Class {r.klass} · {r.subject} · {r.chapter}</span>
                    {r.error && <span className="text-destructive text-xs">{r.error}</span>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
