import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  GraduationCap,
  AlertTriangle,
  BookOpen,
  Library,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { extractPdfText, chunkText } from "@/lib/pdf-extract";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload NCERT PDF — EduPlan AI" },
      {
        name: "description",
        content:
          "Upload an NCERT textbook PDF for any Class 9–12 subject. Our AI reads every page and builds a chapter memory in your Lovable Cloud library.",
      },
    ],
  }),
  component: UploadPage,
});

const CLASSES = ["Class 9", "Class 10", "Class 11", "Class 12"] as const;
const SUBJECTS = ["Chemistry", "Physics", "Biology", "Mathematics"] as const;
const BUCKET = "ncert-pdfs";

type Stage =
  | "idle"
  | "uploading"
  | "reading"
  | "chunking"
  | "saving"
  | "done"
  | "error";

type LibraryBook = {
  id: string;
  class: string;
  subject: string;
  chapter: string;
  file_name: string;
  num_pages: number;
  num_chunks: number;
  created_at: string;
};

function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [klass, setKlass] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [chapter, setChapter] = useState<string>("");
  const [learnerName, setLearnerName] = useState<string>("");
  const [learnerGoals, setLearnerGoals] = useState<string>("");

  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [library, setLibrary] = useState<LibraryBook[]>([]);

  // Folder batch state
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchLog, setBatchLog] = useState<
    {
      name: string;
      status: "ok" | "error" | "skip";
      msg?: string;
      path?: string;
      url?: string;
    }[]
  >([]);

  const refreshLibrary = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("ncert_books")
      .select("id, class, subject, chapter, file_name, num_pages, num_chunks, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!e && data) setLibrary(data as LibraryBook[]);
  }, []);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  const canSubmit =
    !!file &&
    !!klass &&
    !!subject &&
    stage !== "uploading" &&
    stage !== "reading" &&
    stage !== "chunking" &&
    stage !== "saving";

  const onPickFile = useCallback(
    (f: File | null) => {
      setError(null);
      if (!f) return setFile(null);
      if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
        setError("Please upload a PDF file (NCERT textbook chapter).");
        return;
      }
      if (f.size > 50 * 1024 * 1024) {
        setError("PDF is larger than 50 MB. Please split or compress it.");
        return;
      }
      setFile(f);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(f));
    },
    [previewUrl],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files?.[0] ?? null;
      onPickFile(f);
    },
    [onPickFile],
  );

  const ingestPdf = useCallback(
    async (
      f: File,
      meta: {
        klass: string;
        subject: string;
        chapter?: string;
        learnerName?: string;
        learnerGoals?: string;
      },
    ) => {
      setStage("uploading");
      setProgress(0);
      setStatusMsg(`Uploading ${f.name}…`);

      const safeChapter = (meta.chapter || f.name.replace(/\.pdf$/i, "")).trim();
      const slug = `${meta.klass}__${meta.subject}__${safeChapter}__${Date.now()}`
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_.-]/g, "");
      const path = `${meta.klass.replace(/\s+/g, "")}/${meta.subject}/${slug}.pdf`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, f, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;
      setProgress(100);

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const downloadUrl = pub?.publicUrl ?? null;

      setStage("reading");
      setProgress(0);
      setStatusMsg(`Reading every page of ${f.name}…`);
      const extracted = await extractPdfText(f, (p, total) =>
        setProgress((p / total) * 100),
      );

      setStage("chunking");
      setStatusMsg(`Chunking ${extracted.numPages} pages for AI memory…`);
      const chunks = chunkText(extracted.fullText);

      setStage("saving");
      setStatusMsg("Saving NCERT memory to the database…");
      const { data: book, error: bErr } = await supabase
        .from("ncert_books")
        .insert({
          class: meta.klass,
          subject: meta.subject,
          chapter: safeChapter,
          file_name: f.name,
          file_size: f.size,
          storage_path: path,
          download_url: downloadUrl,
          num_pages: extracted.numPages,
          num_chunks: chunks.length,
          full_text: extracted.fullText.slice(0, 1_000_000),
          learner_name: meta.learnerName || null,
          learner_goal: meta.learnerGoals || null,
          status: "ready",
        })
        .select("id")
        .single();
      if (bErr || !book) throw bErr ?? new Error("Insert failed");
      const bookId = book.id as string;

      for (let i = 0; i < extracted.pages.length; i += 200) {
        const slice = extracted.pages.slice(i, i + 200).map((p) => ({
          book_id: bookId,
          page_number: p.page,
          text: p.text,
        }));
        const { error: pErr } = await supabase.from("ncert_pages").insert(slice);
        if (pErr) throw pErr;
        setProgress(((i + slice.length) / extracted.pages.length) * 50);
      }

      for (let i = 0; i < chunks.length; i += 200) {
        const slice = chunks.slice(i, i + 200).map((content, j) => ({
          book_id: bookId,
          chunk_index: i + j,
          content,
        }));
        const { error: cErr } = await supabase.from("ncert_chunks").insert(slice);
        if (cErr) throw cErr;
        setProgress(50 + ((i + slice.length) / chunks.length) * 50);
      }

      return {
        numPages: extracted.numPages,
        numChunks: chunks.length,
        chapter: safeChapter,
        path,
        downloadUrl,
      };
    },
    [],
  );

  const submit = useCallback(async () => {
    if (!file || !klass || !subject) return;
    setError(null);
    try {
      const r = await ingestPdf(file, {
        klass,
        subject,
        chapter,
        learnerName,
        learnerGoals,
      });
      setStage("done");
      setProgress(100);
      setStatusMsg(
        `Saved "${r.chapter}" for ${klass} · ${subject} — ${r.numPages} pages, ${r.numChunks} memory chunks.`,
      );
      refreshLibrary();
    } catch (e) {
      console.error(e);
      setStage("error");
      setError(e instanceof Error ? e.message : "Upload failed.");
    }
  }, [file, klass, subject, chapter, learnerName, learnerGoals, ingestPdf, refreshLibrary]);

  // Folder ingestion: auto-detect class & subject from the folder/file name.
  const detectMeta = useCallback(
    (f: File): { klass: string; subject: string; chapter: string } => {
      // webkitRelativePath: "Class10/Science/ch1.pdf"
      const rel =
        (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
      const joined = rel.toLowerCase().replace(/[_\-()[\]]+/g, " ");

      // Class detection — handles "CLASS_9", "class 10", "Class-12", "ncert_class_9_..."
      let detectedClass = klass;
      const m =
        joined.match(/class\s*(9|10|11|12)\b/) ||
        joined.match(/\bstd\s*(9|10|11|12)\b/) ||
        joined.match(/\b(9|10|11|12)\s*(?:th|standard)\b/);
      if (m) detectedClass = `Class ${m[1]}`;

      // Subject detection — wide alias map for NCERT books
      const SUBJECT_ALIASES: Record<string, string> = {
        physics: "Physics",
        chemistry: "Chemistry",
        biology: "Biology",
        mathematics: "Mathematics",
        maths: "Mathematics",
        math: "Mathematics",
        ganit: "Mathematics",
        science: "Science",
        vigyan: "Science",
        english: "English",
        beehive: "English",
        moments: "English",
        hornbill: "English",
        snapshots: "English",
        words: "English",
        hindi: "Hindi",
        kshitij: "Hindi",
        kritika: "Hindi",
        sparsh: "Hindi",
        sanchayan: "Hindi",
        aroh: "Hindi",
        vitan: "Hindi",
        antra: "Hindi",
        antral: "Hindi",
        sanskrit: "Sanskrit",
        economics: "Economics",
        arthashashtra: "Economics",
        arthashastra: "Economics",
        history: "History",
        itihas: "History",
        geography: "Geography",
        bhugol: "Geography",
        civics: "Civics",
        political: "Political Science",
        polity: "Political Science",
        sociology: "Sociology",
        psychology: "Psychology",
        accountancy: "Accountancy",
        business: "Business Studies",
        computer: "Computer Science",
        informatics: "Informatics Practices",
        ip: "Informatics Practices",
      };
      let detectedSubject = subject;
      for (const key of Object.keys(SUBJECT_ALIASES)) {
        if (new RegExp(`\\b${key}\\b`).test(joined)) {
          detectedSubject = SUBJECT_ALIASES[key];
          break;
        }
      }

      // Always fall back so NO file is skipped.
      if (!detectedClass) detectedClass = klass || "Unspecified Class";
      if (!detectedSubject) detectedSubject = subject || "General";

      const chap = f.name.replace(/\.pdf$/i, "").trim();
      return { klass: detectedClass, subject: detectedSubject, chapter: chap };
    },
    [klass, subject],
  );


  const onPickFolder = useCallback((files: FileList | null) => {
    setError(null);
    if (!files) return;
    const pdfs = Array.from(files).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    setBatchFiles(pdfs);
    setBatchLog([]);
    setBatchIndex(0);
  }, []);

  const runBatch = useCallback(async () => {
    if (batchFiles.length === 0 || batchRunning) return;
    setBatchRunning(true);
    setError(null);
    setBatchLog([]);
    for (let i = 0; i < batchFiles.length; i++) {
      const f = batchFiles[i];
      setBatchIndex(i);
      const meta = detectMeta(f);
      try {
        const r = await ingestPdf(f, {
          klass: meta.klass,
          subject: meta.subject,
          chapter: meta.chapter,
          learnerName,
          learnerGoals,
        });
        setBatchLog((l) => [
          ...l,
          {
            name: f.name,
            status: "ok",
            msg: `${meta.klass} · ${meta.subject} — ${r.numPages}p / ${r.numChunks} chunks · saved to ${r.path}`,
            path: r.path,
            url: r.downloadUrl ?? undefined,
          },
        ]);
      } catch (e) {
        setBatchLog((l) => [
          ...l,
          {
            name: f.name,
            status: "error",
            msg: e instanceof Error ? e.message : "Failed",
          },
        ]);
      }
    }
    setBatchIndex(batchFiles.length);
    setBatchRunning(false);
    setStage("done");
    setStatusMsg(`Folder ingest complete — ${batchFiles.length} files processed.`);
    refreshLibrary();
  }, [batchFiles, batchRunning, detectMeta, ingestPdf, learnerName, learnerGoals, refreshLibrary]);

  const busy =
    stage === "uploading" ||
    stage === "reading" ||
    stage === "chunking" ||
    stage === "saving";

  const stageLabel = useMemo(() => {
    switch (stage) {
      case "uploading":
        return "Uploading";
      case "reading":
        return "Reading PDF";
      case "chunking":
        return "Building memory";
      case "saving":
        return "Saving to database";
      case "done":
        return "Done";
      case "error":
        return "Error";
      default:
        return "Ready";
    }
  }, [stage]);

  const grouped = useMemo(() => {
    const map = new Map<string, LibraryBook[]>();
    for (const b of library) {
      const k = `${b.class} · ${b.subject}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(b);
    }
    return Array.from(map.entries());
  }, [library]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/60">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-soft">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-display font-extrabold text-lg tracking-tight">
              EduPlan AI
            </span>
          </Link>
          <Badge variant="secondary" className="rounded-full">
            {stageLabel}
          </Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">
            Upload an NCERT textbook
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Drop a Class 9–12 NCERT PDF. We read every word, build a chapter memory,
            and store it in your Lovable Cloud library so the AI can reuse it for every
            future generation.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg">1. Book details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={klass} onValueChange={setKlass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASSES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Chapter title (optional)</Label>
                <Input
                  placeholder="e.g. Chapter 1 — Chemical Reactions and Equations"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Learner name (optional)</Label>
                  <Input
                    placeholder="e.g. Aman"
                    value={learnerName}
                    onChange={(e) => setLearnerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Learning goal (optional)</Label>
                  <Input
                    placeholder="e.g. Board exam prep"
                    value={learnerGoals}
                    onChange={(e) => setLearnerGoals(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">2. NCERT PDF</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:bg-muted/40 transition"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-medium truncate max-w-[16rem]">
                      {file.name}
                    </span>
                    <span className="text-muted-foreground">
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <Upload className="h-6 w-6 mx-auto mb-2 text-primary" />
                    Drag &amp; drop the NCERT PDF, or click to browse.
                    <br />
                    PDF only · max 50 MB.
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={!canSubmit}
                onClick={submit}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {stageLabel}…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" /> Start AI reading
                  </>
                )}
              </Button>

              {(busy || stage === "done") && (
                <div className="space-y-2">
                  <Progress value={stage === "done" ? 100 : progress} />
                  <p className="text-xs text-muted-foreground">{statusMsg}</p>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5" /> {error}
                </p>
              )}

              {stage === "done" && (
                <div className="text-sm flex items-start gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 mt-0.5" /> {statusMsg}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Folder batch ingest */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Library className="h-5 w-5 text-primary" /> Bulk folder upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a whole NCERT folder. Every PDF inside (including subfolders) will be
              ingested. Class &amp; subject are auto-detected from folder names like{" "}
              <code className="text-xs bg-muted px-1 rounded">Class10/Science/ch1.pdf</code>.
              Defaults from the form above are used when detection fails.
            </p>

            <div className="flex flex-wrap gap-3 items-center">
              <input
                ref={folderInputRef}
                type="file"
                multiple
                // @ts-expect-error non-standard but widely supported
                webkitdirectory=""
                directory=""
                className="hidden"
                onChange={(e) => onPickFolder(e.target.files)}
              />
              <Button
                variant="secondary"
                onClick={() => folderInputRef.current?.click()}
                disabled={batchRunning}
              >
                <Upload className="h-4 w-4 mr-2" /> Choose folder
              </Button>
              <Button
                onClick={runBatch}
                disabled={batchFiles.length === 0 || batchRunning}
              >
                {batchRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ingesting {batchIndex + 1} / {batchFiles.length}…
                  </>
                ) : (
                  <>Ingest {batchFiles.length || ""} PDFs</>
                )}
              </Button>
              {batchFiles.length > 0 && !batchRunning && (
                <span className="text-xs text-muted-foreground">
                  {batchFiles.length} PDF{batchFiles.length === 1 ? "" : "s"} queued
                </span>
              )}
            </div>

            {batchRunning && (
              <Progress
                value={(batchIndex / Math.max(batchFiles.length, 1)) * 100}
              />
            )}

            {batchLog.length > 0 && (
              <ul className="text-sm space-y-1 max-h-72 overflow-auto rounded-lg border border-border p-3 bg-muted/30">
                {batchLog.map((l, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {l.status === "ok" ? (
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
                    ) : l.status === "skip" ? (
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{l.name}</p>
                      {l.msg && (
                        <p className="text-xs text-muted-foreground">{l.msg}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>


        {previewUrl && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" /> PDF preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <object
                data={previewUrl}
                type="application/pdf"
                className="w-full h-[70vh] rounded-lg border border-border bg-muted/30"
              >
                <p className="p-4 text-sm text-muted-foreground">
                  Your browser can't display PDFs inline.{" "}
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Open the file
                  </a>
                  .
                </p>
              </object>
            </CardContent>
          </Card>
        )}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Library className="h-5 w-5 text-primary" /> Your NCERT library
            </CardTitle>
          </CardHeader>
          <CardContent>
            {library.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No books uploaded yet. Your library will appear here, grouped by
                class &amp; subject.
              </p>
            ) : (
              <div className="space-y-6">
                {grouped.map(([group, books]) => (
                  <div key={group}>
                    <h3 className="font-display font-bold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                      {group}
                    </h3>
                    <ul className="grid sm:grid-cols-2 gap-3">
                      {books.map((b) => (
                        <li
                          key={b.id}
                          className="rounded-xl border border-border p-3 bg-card/60"
                        >
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 mt-0.5 text-primary" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{b.chapter}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {b.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {b.num_pages} pages · {b.num_chunks} memory chunks
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
