import { encodeReferenceVisuals, splitReferenceContent } from "@/lib/reference-visuals";
import { prepareScannedReferenceBooks, type ReferenceReadSummary } from "@/lib/prepare-reference-books";
import { readScannedPage } from "@/lib/reference-ocr.functions";
import { saveCapturedReferencePage } from "@/lib/reference-capture.functions";
import { createLocalBookReader } from "@/lib/local-book-reader";
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
  FlaskConical,
  Zap,
  FileText,
  CheckCircle2,
  Loader2,
  GraduationCap,
  AlertTriangle,
  BookOpen,
  Library,
  RefreshCw,
  History,
  Clock,
  Circle,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { extractPdfText, chunkText } from "@/lib/pdf-extract";
import {
  createUploadTicket,
  signDownload,
  insertBook,
  insertPages,
  insertChunks,
  classifyMedEasyLibrary,
} from "@/lib/ingest.functions";
import { medEasyLibraryMetadata, combinedReferenceSubject } from "@/lib/reference-books";

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
  const [referenceReading, setReferenceReading] = useState(false);
  const [referenceStatus, setReferenceStatus] = useState("");
  const [classificationError, setClassificationError] = useState<string | null>(null);
  const medEasyClassified = useRef(false);
  const referenceCancelled = useRef(false);
  useEffect(() => () => { referenceCancelled.current = true; }, []);
  async function readReferenceLibrary(subjects = ["Chemistry", "Physics", "Biology"]) {
    referenceCancelled.current = false;
    setReferenceReading(true);
    setReferenceStatus("Opening scanned reference books…");
    try {
      const summaries: ReferenceReadSummary[] = [];
      for (const subject of subjects) {
        if (referenceCancelled.current) break;
        summaries.push(...await prepareScannedReferenceBooks("Class 11", subject, setReferenceStatus, () => referenceCancelled.current));
      }
      setReferenceStatus(referenceCancelled.current ? "Reading paused. Completed pages are saved." : summaries.length ? `${summaries.length} Med Easy books inspected · ${summaries.reduce((sum,book) => sum + book.pages, 0)} pages · ${summaries.reduce((sum,book) => sum + book.figures, 0)} screenshots saved. Available in teacher notes and Generate PPT & Notes for Classes 11 and 12.` : "No matching Med Easy books were found. Upload the reference PDFs first.");
      await refreshLibrary();
    } catch (error) {
      setReferenceStatus(error instanceof Error ? error.message : String(error));
    } finally { setReferenceReading(false); }
  }


  // Per-step audit log entry for each PDF
  type StepName =
    | "upload"
    | "parse"
    | "chunk"
    | "store-book"
    | "store-pages"
    | "store-chunks";
  type StepEvent = {
    name: StepName;
    label: string;
    ts: number;
    status: "start" | "ok" | "error";
    msg?: string;
  };
  type BatchLogEntry = {
    id: string;
    name: string;
    status: "pending" | "running" | "ok" | "error" | "skip";
    msg?: string;
    path?: string;
    url?: string;
    steps: StepEvent[];
    file: File;
    meta?: { klass: string; subject: string; chapter: string };
    startedAt?: number;
    endedAt?: number;
  };

  // Folder batch state
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchLog, setBatchLog] = useState<BatchLogEntry[]>([]);
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});

  const [libraryVerify, setLibraryVerify] = useState<{
    checking: boolean;
    total: number;
    loaded: number;
    lastChecked: number | null;
    message: string;
  }>({ checking: false, total: 0, loaded: 0, lastChecked: null, message: "" });

  const refreshLibrary = useCallback(async () => {
    setLibraryVerify((v) => ({ ...v, checking: true, message: "Verifying library…" }));
    if (!medEasyClassified.current) {
      try { await classifyMedEasyLibrary(); medEasyClassified.current = true; setClassificationError(null); }
      catch { setClassificationError("Med Easy class labels could not be saved. Displaying the combined Class 11 & 12 classification; verify again to retry saving."); }
    }
    // 1. Get authoritative total count
    const { count } = await supabase
      .from("ncert_books")
      .select("id", { count: "exact", head: true });
    const total = count ?? 0;

    // 2. Page through every row (no 50-row cap, no 1000-row PostgREST cap)
    const pageSize = 500;
    const all: LibraryBook[] = [];
    for (let from = 0; from < Math.max(total, 1); from += pageSize) {
      const to = from + pageSize - 1;
      const { data, error: e } = await supabase
        .from("ncert_books")
        .select("id, class, subject, chapter, file_name, num_pages, num_chunks, created_at")
        .order("class", { ascending: true })
        .order("subject", { ascending: true })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (e) break;
      if (!data || data.length === 0) break;
      all.push(...(data as LibraryBook[]));
      if (data.length < pageSize) break;
    }
    setLibrary(all.map(medEasyLibraryMetadata));
    setLibraryVerify({
      checking: false,
      total,
      loaded: all.length,
      lastChecked: Date.now(),
      message:
        all.length === total
          ? `All ${total} books verified and visible.`
          : `Showing ${all.length} of ${total} books — retrying…`,
    });
  }, []);

  useEffect(() => {
    refreshLibrary();
    // Auto-verify every 20s so newly-ingested PDFs always appear without a manual reload.
    const id = setInterval(refreshLibrary, 20000);
    return () => clearInterval(id);
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
      onStep?: (s: Omit<StepEvent, "ts">) => void,
    ) => {
      const step = (s: Omit<StepEvent, "ts">) => onStep?.(s);

      setStage("uploading");
      setProgress(0);
      setStatusMsg(`Uploading ${f.name}…`);
      step({ name: "upload", label: "Upload to storage", status: "start" });

      const safeChapter = (meta.chapter || f.name.replace(/\.pdf$/i, "")).trim();
      const slug = `${meta.klass}__${meta.subject}__${safeChapter}__${Date.now()}`
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_.-]/g, "");
      const path = `${meta.klass.replace(/\s+/g, "")}/${meta.subject}/${slug}.pdf`;

      // Get a service-role-signed upload ticket, then upload the file directly with it.
      let ticket;
      try {
        ticket = await createUploadTicket({ data: { path } });
      } catch (e: any) {
        step({ name: "upload", label: "Upload to storage", status: "error", msg: e?.message ?? "ticket failed" });
        throw e;
      }
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(path, ticket.token, f, { contentType: "application/pdf" });
      if (upErr) {
        step({ name: "upload", label: "Upload to storage", status: "error", msg: upErr.message });
        throw upErr;
      }
      setProgress(100);
      step({ name: "upload", label: "Upload to storage", status: "ok", msg: path });

      let downloadUrl: string | null = null;
      try {
        const signed = await signDownload({ data: { path } });
        downloadUrl = signed.signedUrl;
      } catch {
        downloadUrl = null;
      }

      setStage("reading");
      setProgress(0);
      setStatusMsg(`Reading every page of ${f.name}…`);
      step({ name: "parse", label: "Parse PDF pages", status: "start" });
      let extracted;
      const referenceSubject = combinedReferenceSubject({ file_name: f.name });
      const localReader = referenceSubject ? createLocalBookReader(setStatusMsg) : null;
      let referenceChapter = "";
      try {
        extracted = await extractPdfText(f, (p, total) =>
          setProgress((p / total) * 100),
          { inspectEveryPage: !!localReader, recognizePage: async (image, page, aspect, nativeText) => {
            if (!localReader) return readScannedPage({ data: { image, page, aspect, source_path: path, source_file_name: f.name } });
            let text = "";
            try { text = await localReader.recognize(image, nativeText); }
            catch { setStatusMsg(`Saving page ${page}; chapter matching needs review.`); }
            const content = await saveCapturedReferencePage({ data: { image, text, page, aspect, source_path: path, source_file_name: f.name, chapter_hint: referenceChapter } });
            referenceChapter = splitReferenceContent(content).context?.chapter || "";
            return content;
          } },
        );
      } catch (e) {
        step({ name: "parse", label: "Parse PDF pages", status: "error", msg: e instanceof Error ? e.message : "parse failed" });
        throw e;
      } finally { await localReader?.close(); }
      if (!referenceSubject && !splitReferenceContent(extracted.fullText).text.trim()) throw new Error("No readable notes were found in this PDF. Please check the scanned pages.");
      step({ name: "parse", label: "Parse PDF pages", status: "ok", msg: `${extracted.numPages} pages` });

      setStage("chunking");
      setStatusMsg(`Chunking ${extracted.numPages} pages for AI memory…`);
      step({ name: "chunk", label: "Build memory chunks", status: "start" });
      const chunks = referenceSubject ? extracted.pages.map(page => page.text) : extracted.pages.flatMap(page => {
        const source = splitReferenceContent(page.text);
        return [...(source.text ? chunkText(source.text).map(text => encodeReferenceVisuals(text, [], source.context)) : []), ...(source.visuals.length ? [encodeReferenceVisuals("", source.visuals, source.context)] : [])];
      });
      step({ name: "chunk", label: "Build memory chunks", status: "ok", msg: `${chunks.length} chunks` });

      setStage("saving");
      setStatusMsg("Saving NCERT memory to the database…");
      step({ name: "store-book", label: "Insert book record", status: "start" });
      let bookId: string;
      try {
        const r = await insertBook({
          data: {
            klass: meta.klass,
            subject: meta.subject,
            chapter: safeChapter,
            file_name: f.name,
            file_size: f.size,
            storage_path: path,
            download_url: downloadUrl,
            num_pages: extracted.numPages,
            num_chunks: chunks.length,
            full_text: splitReferenceContent(extracted.fullText).text.slice(0, 1_000_000),
            learner_name: meta.learnerName || null,
            learner_goal: meta.learnerGoals || null,
          },
        });
        bookId = r.id;
      } catch (e: any) {
        step({ name: "store-book", label: "Insert book record", status: "error", msg: e?.message ?? "insert failed" });
        throw e;
      }
      step({ name: "store-book", label: "Insert book record", status: "ok", msg: bookId });

      step({ name: "store-pages", label: "Store page text", status: "start" });
      const PAGE_BATCH = 200;
      for (let i = 0; i < extracted.pages.length; i += PAGE_BATCH) {
        const slice = extracted.pages.slice(i, i + PAGE_BATCH).map((p) => ({
          page_number: p.page,
          text: referenceSubject ? "[SOURCE_OCR_PAGE]\n" + p.text : p.text,
        }));
        try {
          await insertPages({ data: { book_id: bookId, pages: slice } });
        } catch (e: any) {
          step({ name: "store-pages", label: "Store page text", status: "error", msg: e?.message ?? "insert failed" });
          throw e;
        }
        setProgress(((i + slice.length) / extracted.pages.length) * 50);
      }
      step({ name: "store-pages", label: "Store page text", status: "ok", msg: `${extracted.pages.length} pages` });

      step({ name: "store-chunks", label: "Store memory chunks", status: "start" });
      const CHUNK_BATCH = 200;
      for (let i = 0; i < chunks.length; i += CHUNK_BATCH) {
        const slice = chunks.slice(i, i + CHUNK_BATCH);
        try {
          await insertChunks({ data: { book_id: bookId, start_index: i, chunks: slice } });
        } catch (e: any) {
          step({ name: "store-chunks", label: "Store memory chunks", status: "error", msg: e?.message ?? "insert failed" });
          throw e;
        }
        setProgress(50 + ((i + slice.length) / chunks.length) * 50);
      }
      step({ name: "store-chunks", label: "Store memory chunks", status: "ok", msg: `${chunks.length} chunks` });

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


  const updateEntry = useCallback(
    (id: string, patch: Partial<BatchLogEntry> | ((e: BatchLogEntry) => BatchLogEntry)) => {
      setBatchLog((prev) =>
        prev.map((e) =>
          e.id === id
            ? typeof patch === "function"
              ? patch(e)
              : { ...e, ...patch }
            : e,
        ),
      );
    },
    [],
  );

  const recordStep = useCallback(
    (id: string, s: Omit<StepEvent, "ts">) => {
      const event: StepEvent = { ...s, ts: Date.now() };
      updateEntry(id, (e) => ({ ...e, steps: [...e.steps, event] }));
    },
    [updateEntry],
  );

  const onPickFolder = useCallback(
    (files: FileList | null) => {
      setError(null);
      if (!files) return;
      const pdfs = Array.from(files).filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      );
      setBatchFiles(pdfs);
      setBatchIndex(0);
      // Pre-populate audit log entries so the user sees every queued file.
      const entries: BatchLogEntry[] = pdfs.map((f) => {
        const meta = detectMeta(f);
        return {
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${f.name}-${Math.random()}`,
          name: f.name,
          status: "pending",
          steps: [],
          file: f,
          meta,
        };
      });
      setBatchLog(entries);
    },
    [detectMeta],
  );

  // Run a batch of entries through the ingestion pipeline.
  const runEntries = useCallback(
    async (entries: BatchLogEntry[]) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const f = entry.file;
        const meta = entry.meta ?? detectMeta(f);
        setBatchIndex(i);
        updateEntry(entry.id, {
          status: "running",
          startedAt: Date.now(),
          steps: [],
          meta,
        });
        try {
          const r = await ingestPdf(
            f,
            {
              klass: meta.klass,
              subject: meta.subject,
              chapter: meta.chapter,
              learnerName,
              learnerGoals,
            },
            (s) => recordStep(entry.id, s),
          );
          updateEntry(entry.id, {
            status: "ok",
            endedAt: Date.now(),
            path: r.path,
            url: r.downloadUrl ?? undefined,
            msg: `${meta.klass} · ${meta.subject} — ${r.numPages}p / ${r.numChunks} chunks`,
          });
        } catch (e) {
          updateEntry(entry.id, {
            status: "error",
            endedAt: Date.now(),
            msg: e instanceof Error ? e.message : "Failed",
          });
        }
      }
    },
    [detectMeta, ingestPdf, learnerName, learnerGoals, recordStep, updateEntry],
  );

  const runBatch = useCallback(async () => {
    if (batchRunning) return;
    const pending = batchLog.filter((e) => e.status === "pending");
    if (pending.length === 0) return;
    setBatchRunning(true);
    setError(null);
    await runEntries(pending);
    setBatchIndex(pending.length);
    setBatchRunning(false);
    setStage("done");
    setStatusMsg(`Folder ingest complete — ${pending.length} files processed.`);
    refreshLibrary();
  }, [batchLog, batchRunning, runEntries, refreshLibrary]);

  const failedEntries = useMemo(
    () => batchLog.filter((e) => e.status === "error" || e.status === "skip"),
    [batchLog],
  );

  const retryFailed = useCallback(async () => {
    if (batchRunning || failedEntries.length === 0) return;
    setBatchRunning(true);
    setError(null);
    // Reset their state to pending before re-running.
    setBatchLog((prev) =>
      prev.map((e) =>
        e.status === "error" || e.status === "skip"
          ? { ...e, status: "pending", steps: [], msg: undefined, endedAt: undefined }
          : e,
      ),
    );
    await runEntries(failedEntries);
    setBatchRunning(false);
    setStage("done");
    setStatusMsg(`Retry complete — ${failedEntries.length} files reprocessed.`);
    refreshLibrary();
  }, [batchRunning, failedEntries, runEntries, refreshLibrary]);

  const toggleSteps = useCallback((id: string) => {
    setOpenSteps((s) => ({ ...s, [id]: !s[id] }));
  }, []);


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
                disabled={
                  batchLog.filter((e) => e.status === "pending").length === 0 ||
                  batchRunning
                }
              >
                {batchRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ingesting {Math.min(batchIndex + 1, batchFiles.length)} /{" "}
                    {batchFiles.length}…
                  </>
                ) : (
                  <>Ingest {batchLog.filter((e) => e.status === "pending").length || ""} PDFs</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={retryFailed}
                disabled={failedEntries.length === 0 || batchRunning}
                title="Re-ingest only the items that previously failed or were skipped"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry failed ({failedEntries.length})
              </Button>
              <Link
                to="/history"
                className="ml-auto text-sm text-primary underline-offset-4 hover:underline inline-flex items-center gap-1"
              >
                <History className="h-4 w-4" /> Ingestion history
              </Link>
              {batchFiles.length > 0 && !batchRunning && (
                <span className="text-xs text-muted-foreground basis-full">
                  {batchFiles.length} PDF{batchFiles.length === 1 ? "" : "s"} selected ·{" "}
                  {batchLog.filter((e) => e.status === "ok").length} done ·{" "}
                  {failedEntries.length} failed
                </span>
              )}
            </div>

            {batchRunning && (
              <Progress
                value={(batchIndex / Math.max(batchFiles.length, 1)) * 100}
              />
            )}

            {batchLog.length > 0 && (
              <ul className="text-sm space-y-2 max-h-96 overflow-auto rounded-lg border border-border p-3 bg-muted/30">
                {batchLog.map((l) => {
                  const isOpen = openSteps[l.id];
                  const duration =
                    l.startedAt && l.endedAt
                      ? `${((l.endedAt - l.startedAt) / 1000).toFixed(1)}s`
                      : null;
                  return (
                    <li
                      key={l.id}
                      className="rounded-md border border-border/60 bg-card/60 p-2"
                    >
                      <div className="flex items-start gap-2">
                        {l.status === "ok" ? (
                          <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                        ) : l.status === "running" ? (
                          <Loader2 className="h-4 w-4 mt-0.5 text-primary animate-spin shrink-0" />
                        ) : l.status === "pending" ? (
                          <Circle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        ) : l.status === "skip" ? (
                          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="truncate font-medium">{l.name}</p>
                            {l.meta && (
                              <Badge variant="secondary" className="rounded-full text-[10px]">
                                {l.meta.klass} · {l.meta.subject}
                              </Badge>
                            )}
                            {duration && (
                              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {duration}
                              </span>
                            )}
                          </div>
                          {l.msg && (
                            <p className="text-xs text-muted-foreground break-all">{l.msg}</p>
                          )}
                          <div className="flex gap-3 mt-1">
                            {l.url && (
                              <a
                                href={l.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary underline break-all"
                              >
                                Open saved file
                              </a>
                            )}
                            {l.steps.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleSteps(l.id)}
                                className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                              >
                                {isOpen ? "Hide" : "Show"} audit ({l.steps.length})
                              </button>
                            )}
                          </div>
                          {isOpen && l.steps.length > 0 && (
                            <ol className="mt-2 space-y-1 border-l-2 border-border pl-3">
                              {l.steps.map((s, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-xs">
                                  {s.status === "ok" ? (
                                    <CheckCircle2 className="h-3 w-3 mt-0.5 text-emerald-600 shrink-0" />
                                  ) : s.status === "error" ? (
                                    <AlertTriangle className="h-3 w-3 mt-0.5 text-destructive shrink-0" />
                                  ) : (
                                    <Loader2 className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                                  )}
                                  <span className="font-medium">{s.label}</span>
                                  <span className="text-muted-foreground">
                                    {s.status === "start" ? "started" : s.status}
                                  </span>
                                  {s.msg && (
                                    <span className="text-muted-foreground truncate">— {s.msg}</span>
                                  )}
                                  <span className="ml-auto text-muted-foreground shrink-0">
                                    {new Date(s.ts).toLocaleTimeString()}
                                  </span>
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
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
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-lg flex items-center gap-2">
                <Library className="h-5 w-5 text-primary" /> Your NCERT library
              </CardTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {libraryVerify.checking ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Verifying…
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    {libraryVerify.loaded === libraryVerify.total ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                    )}
                    {libraryVerify.loaded}/{libraryVerify.total} books
                    {libraryVerify.lastChecked && (
                      <> · checked {new Date(libraryVerify.lastChecked).toLocaleTimeString()}</>
                    )}
                  </span>
                )}
                <button
                  type="button"
                  onClick={refreshLibrary}
                  className="rounded-md border border-border px-2 py-1 hover:bg-muted"
                >
                  Verify now
                </button>
              </div>
            </div>
            {libraryVerify.message && (
              <p className="text-xs text-muted-foreground mt-1">{libraryVerify.message}</p>
            )}
          </CardHeader>

          <CardContent>
            <div className="mb-5 rounded-xl border border-border p-4 space-y-2">
              {classificationError && <p className="text-sm text-muted-foreground" role="status">{classificationError}</p>}
              <p className="text-sm">Inspect every page of Physics, Chemistry, Botany and Zoology Med Easy books to save original diagrams, reaction maps, structures and labelled biology screenshots. They are added by chapter and topic to teacher notes and Generate PPT &amp; Notes for Classes 11 and 12. Existing formulas, derivations and wording are preserved. Large books take time; completed pages are saved so reading can resume.</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => readReferenceLibrary(["Chemistry"])} disabled={referenceReading || library.length === 0}><FlaskConical className="h-4 w-4 mr-2" />Read / resume Chemistry</Button>
                <Button onClick={() => readReferenceLibrary(["Physics"])} disabled={referenceReading || library.length === 0}><Zap className="h-4 w-4 mr-2" />Read / resume Physics</Button>
                <Button onClick={() => readReferenceLibrary(["Biology"])} disabled={referenceReading || library.length === 0}><BookOpen className="h-4 w-4 mr-2" />Read / resume Botany & Zoology</Button>
                <Button variant="outline" onClick={() => readReferenceLibrary()} disabled={referenceReading || library.length === 0}>
                  {referenceReading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BookOpen className="h-4 w-4 mr-2" />}
                  All reference books
                </Button>
                {referenceReading && <Button variant="outline" onClick={() => { referenceCancelled.current = true; setReferenceStatus("Pausing after the current page…"); }}>Pause</Button>}
              </div>
              {referenceStatus && <p className="text-sm text-muted-foreground" role="status">{referenceStatus}</p>}
            </div>
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
