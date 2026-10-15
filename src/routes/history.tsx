import { approveNcertSource } from "@/lib/library-access.functions";
import { LibraryAccessGate } from "@/components/LibraryAccessGate";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  History as HistoryIcon,
  Loader2,
  RefreshCw,
  FileText,
  ExternalLink,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { signDownload, classifyMedEasyLibrary } from "@/lib/ingest.functions";
import { medEasyLibraryMetadata, combinedReferenceMatches } from "@/lib/reference-books";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Ingestion history — EduPlan AI" },
      { property: "og:title", content: "Book Upload History — EduPlan AI" },
      { property: "og:description", content: "Review saved NCERT books by class, subject and upload status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "description",
        content:
          "Every NCERT PDF that has been uploaded to your Lovable Cloud library, with class, subject, ingestion status and storage path.",
      },
    ],
  }),
  component: () => <LibraryAccessGate><HistoryPage /></LibraryAccessGate>,
});

const BUCKET = "ncert-pdfs";

type Row = {
  source_kind?: string;
  id: string;
  class: string;
  subject: string;
  chapter: string;
  file_name: string;
  file_size: number;
  storage_path: string;
  download_url: string | null;
  num_pages: number;
  num_chunks: number;
  status: string;
  created_at: string;
};

function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [klass, setKlass] = useState<string>("all");
  const [subject, setSubject] = useState<string>("all");
  const [signing, setSigning] = useState<string | null>(null);
  const [classificationError, setClassificationError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { await classifyMedEasyLibrary(); setClassificationError(null); }
    catch { setClassificationError("Med Easy class labels could not be saved. Displaying the combined Class 11 & 12 classification; refresh to retry saving."); }
    const { data } = await supabase
      .from("ncert_books")
      .select(
        "id, source_kind, class, subject, chapter, file_name, file_size, storage_path, download_url, num_pages, num_chunks, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    setRows(((data as Row[]) ?? []).map(medEasyLibraryMetadata));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const classes = useMemo(
    () => Array.from(new Set(rows.flatMap((r) => r.class === "Class 11 & 12" ? [r.class, "Class 11", "Class 12"] : [r.class]))).sort(),
    [rows],
  );
  const subjects = useMemo(
    () => Array.from(new Set(rows.map((r) => r.subject))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (klass !== "all" && r.class !== klass && !combinedReferenceMatches(r, klass, r.subject)) return false;
      if (subject !== "all" && r.subject !== subject) return false;
      if (!needle) return true;
      return (
        r.file_name.toLowerCase().includes(needle) ||
        r.chapter.toLowerCase().includes(needle) ||
        r.storage_path.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, klass, subject]);

  const openFile = useCallback(
    async (row: Row) => {
      setSigning(row.id);
      try {
        const { signedUrl } = await signDownload({ data: { path: row.storage_path } });
        if (signedUrl) window.open(signedUrl, "_blank", "noopener,noreferrer");
      } finally {
        setSigning(null);
      }
    },
    [],
  );

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
          <div className="flex items-center gap-3">
            <Link to="/upload" className="text-sm underline-offset-4 hover:underline">
              ← Back to upload
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-10">
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-2">
              <HistoryIcon className="h-7 w-7 text-primary" /> Ingestion history
            </h1>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              Every NCERT PDF that has been uploaded, parsed and stored — with class,
              subject, current status, storage path and a direct file link.
            </p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {filtered.length} of {rows.length} records
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-4 gap-3">
              <Input
                placeholder="Search file, chapter or path…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="sm:col-span-2"
              />
              <Select value={klass} onValueChange={setKlass}>
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {classificationError && <p className="text-sm text-muted-foreground" role="status">{classificationError}</p>}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">File</th>
                      <th className="px-3 py-2">Class</th>
                      <th className="px-3 py-2">Subject</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Pages / Chunks</th>
                      <th className="px-3 py-2">Storage path</th>
                      <th className="px-3 py-2">Uploaded</th>
                      <th className="px-3 py-2 text-right">File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                          <Loader2 className="h-4 w-4 mx-auto animate-spin" />
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                          No matching uploads yet.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((r) => (
                        <tr key={r.id} className="border-t border-border align-top">
                          <td className="px-3 py-2 min-w-[14rem]">
                            <p className="font-medium truncate">{r.chapter}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {r.file_name}
                            </p>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.class}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.subject}</td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={r.status === "ready" ? "secondary" : "outline"}
                              className="rounded-full text-[10px]"
                            >
                              {r.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                            {r.num_pages}p · {r.num_chunks} chunks
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground break-all max-w-xs">
                            {r.storage_path}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {r.source_kind === "ncert" ? <p className="text-xs text-emerald-700">Verified NCERT source</p> : <Button size="sm" variant="outline" onClick={async()=>{if(!window.confirm("Have you opened and checked that this file is an official NCERT textbook? Approve only after verifying the publisher and content."))return;try{await approveNcertSource({data:{book_id:r.id,confirmed:true}});await load();}catch(error){window.alert(error instanceof Error?error.message:"Approval failed");}}}>Verify as NCERT</Button>}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openFile(r)}
                              disabled={signing === r.id}
                            >
                              {signing === r.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <ExternalLink className="h-3 w-3 mr-1" /> Open
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
