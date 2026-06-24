import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { doc, setDoc, collection, writeBatch, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";

import { firebaseConfigured, getFirebase } from "@/lib/firebase";
import { extractPdfText, chunkText } from "@/lib/pdf-extract";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload NCERT PDF — EduPlan AI" },
      { name: "description", content: "Upload an NCERT textbook PDF for any Class 9–12 subject. Our AI reads every page and builds a chapter memory." },
    ],
  }),
  component: UploadPage,
});

const CLASSES = ["Class 9", "Class 10", "Class 11", "Class 12"] as const;
const SUBJECTS = ["Chemistry", "Physics", "Biology", "Mathematics"] as const;

type Stage =
  | "idle"
  | "uploading"
  | "reading"
  | "chunking"
  | "saving"
  | "done"
  | "error";

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

  const canSubmit =
    !!file &&
    !!klass &&
    !!subject &&
    stage !== "uploading" &&
    stage !== "reading" &&
    stage !== "chunking" &&
    stage !== "saving";

  const onPickFile = useCallback((f: File | null) => {
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
  }, [previewUrl]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0] ?? null;
    onPickFile(f);
  }, [onPickFile]);

  const submit = useCallback(async () => {
    if (!file || !klass || !subject) return;
    if (!firebaseConfigured) {
      setError(
        "Firebase isn't configured yet. Add VITE_FIREBASE_* keys in Workspace Settings → Build Secrets, then redeploy.",
      );
      return;
    }
    setError(null);
    setStage("uploading");
    setProgress(0);
    setStatusMsg("Uploading PDF to Firebase Storage…");

    try {
      const { db, storage } = getFirebase();
      const safeChapter = (chapter || file.name.replace(/\.pdf$/i, "")).trim();
      const docId = `${klass}__${subject}__${safeChapter}__${Date.now()}`
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_.-]/g, "");

      // 1. Upload PDF
      const path = `ncert/${klass.replace(/\s+/g, "")}/${subject}/${docId}.pdf`;
      const ref = storageRef(storage, path);
      const task = uploadBytesResumable(ref, file, { contentType: "application/pdf" });
      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => setProgress((snap.bytesTransferred / snap.totalBytes) * 100),
          reject,
          () => resolve(),
        );
      });
      const downloadUrl = await getDownloadURL(ref);

      // 2. Extract text from every page
      setStage("reading");
      setProgress(0);
      setStatusMsg("Reading every page of the PDF…");
      const extracted = await extractPdfText(file, (p, total) =>
        setProgress((p / total) * 100),
      );

      // 3. Chunk for memory / RAG
      setStage("chunking");
      setStatusMsg(`Chunking ${extracted.numPages} pages for AI memory…`);
      const chunks = chunkText(extracted.fullText);

      // 4. Save metadata + pages + chunks to Firestore
      setStage("saving");
      setStatusMsg("Saving NCERT memory to Firestore…");

      const bookRef = doc(db, "ncert_books", docId);
      await setDoc(bookRef, {
        id: docId,
        class: klass,
        subject,
        chapter: safeChapter,
        fileName: file.name,
        fileSize: file.size,
        storagePath: path,
        downloadUrl,
        numPages: extracted.numPages,
        numChunks: chunks.length,
        learnerProfile: {
          name: learnerName || null,
          goals: learnerGoals || null,
        },
        status: "pending_summary",
        createdAt: serverTimestamp(),
      });

      // Pages: batch writes (max 500 per batch)
      const pagesCol = collection(db, "ncert_books", docId, "pages");
      for (let i = 0; i < extracted.pages.length; i += 400) {
        const batch = writeBatch(db);
        for (const p of extracted.pages.slice(i, i + 400)) {
          batch.set(doc(pagesCol, String(p.page)), p);
        }
        await batch.commit();
      }

      // Chunks
      const chunksCol = collection(db, "ncert_books", docId, "chunks");
      for (let i = 0; i < chunks.length; i += 400) {
        const batch = writeBatch(db);
        chunks.slice(i, i + 400).forEach((text, j) => {
          const idx = i + j;
          batch.set(doc(chunksCol, String(idx)), { index: idx, text });
        });
        await batch.commit();
      }

      setStage("done");
      setStatusMsg(
        `Saved “${safeChapter}” for ${klass} · ${subject} — ${extracted.numPages} pages, ${chunks.length} memory chunks.`,
      );
    } catch (e) {
      console.error(e);
      setStage("error");
      setError(e instanceof Error ? e.message : "Upload failed.");
    }
  }, [file, klass, subject, chapter, learnerName, learnerGoals]);

  const busy = stage === "uploading" || stage === "reading" || stage === "chunking" || stage === "saving";

  const stageLabel = useMemo(() => {
    switch (stage) {
      case "uploading": return "Uploading";
      case "reading": return "Reading PDF";
      case "chunking": return "Building memory";
      case "saving": return "Saving to Firestore";
      case "done": return "Done";
      case "error": return "Error";
      default: return "Ready";
    }
  }, [stage]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/60">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-soft">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-display font-extrabold text-lg tracking-tight">EduPlan AI</span>
          </Link>
          <Badge variant="secondary" className="rounded-full">{stageLabel}</Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">
            Upload an NCERT textbook
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Drop a Class 9–12 NCERT PDF. We read every word, build a chapter memory, and store
            it in your Firebase database so the AI can reuse it for every future generation.
          </p>
        </div>

        {!firebaseConfigured && (
          <Card className="mb-6 border-amber-300 bg-amber-50/60 dark:bg-amber-950/20">
            <CardContent className="py-4 flex gap-3 items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Firebase not configured</p>
                <p className="text-muted-foreground mt-1">
                  Add these as <strong>Build Secrets</strong> in Workspace Settings, then redeploy:
                  <code className="block mt-2 p-2 rounded bg-background/60 font-mono text-xs leading-6">
                    VITE_FIREBASE_API_KEY<br />
                    VITE_FIREBASE_AUTH_DOMAIN<br />
                    VITE_FIREBASE_PROJECT_ID<br />
                    VITE_FIREBASE_STORAGE_BUCKET<br />
                    VITE_FIREBASE_MESSAGING_SENDER_ID<br />
                    VITE_FIREBASE_APP_ID
                  </code>
                  Get these from Firebase Console → Project Settings → Your apps → SDK setup &amp; configuration.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                    <span className="font-medium truncate max-w-[16rem]">{file.name}</span>
                    <span className="text-muted-foreground">
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <Upload className="h-6 w-6 mx-auto mb-2 text-primary" />
                    Drag &amp; drop the NCERT PDF, or click to browse.<br />
                    PDF only · max 50 MB.
                  </div>
                )}
              </div>

              <Button className="w-full" size="lg" disabled={!canSubmit} onClick={submit}>
                {busy ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {stageLabel}…</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Start AI reading</>
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
                  <a href={previewUrl} target="_blank" rel="noreferrer" className="underline">
                    Open the file
                  </a>.
                </p>
              </object>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
