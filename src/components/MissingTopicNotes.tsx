import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  searchMissingTopic,
  readMissingTopicNotes,
  saveMissingTopicNotes,
} from "@/lib/topic-notes.functions";
import type { Slide } from "@/lib/generate.functions";

type Props = {
  slide: Slide;
  klass: string;
  subject: string;
  chapter: string;
  onSaved: (slide: Slide) => void;
};
export function MissingTopicNotes({ slide, klass, subject, chapter, onSaved }: Props) {
  const scope = { klass, subject, chapter, topic: slide.title };
  const draftKey = "missing-topic-draft:" + JSON.stringify([klass, subject, chapter, slide.title]);
  const [open, setOpen] = useState(false),
    [text, setText] = useState(""),
    [url, setUrl] = useState(""),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [official, setOfficial] = useState(false),
    [results, setResults] = useState<Array<{ url: string; title: string; lines: string[] }>>([]);
  const search = useServerFn(searchMissingTopic),
    read = useServerFn(readMissingTopicNotes),
    save = useServerFn(saveMissingTopicNotes);
  useEffect(() => {
    setQuery(`Class ${klass} ${subject} ${chapter} ${slide.title} NCERT notes`);
    try {
      setText(localStorage.getItem(draftKey) || "");
    } catch {}
    let current = true;
    void read({ data: scope })
      .then((saved) => {
        if (current && saved) {
          if (!localStorage.getItem(draftKey))
            setText(saved.sections.flatMap((section) => section.lines).join("\n"));
          setUrl(saved.sourceUrl);
          onSaved({
            ...slide,
            sections: saved.sections,
            topic_recovery: { status: saved.mode, sourceUrl: saved.sourceUrl },
          });
        }
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [draftKey]);
  function edit(value: string) {
    setText(value);
    setOfficial(false);
    try {
      localStorage.setItem(draftKey, value);
    } catch {
      setNotice("Device storage is unavailable. Copy your draft before leaving.");
    }
  }
  async function find(useUrl = false) {
    setBusy(true);
    setNotice("");
    try {
      const found = await search({ data: { ...scope, ...(useUrl ? { url } : {}) } });
      setResults(found);
      if (!found.some((item) => item.lines.length))
        setNotice(
          "No complete matching extraction was found. Open Google, paste a supported official page link, or write teacher notes below.",
        );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Search failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  async function preserve() {
    setBusy(true);
    setNotice("");
    try {
      const saved = await save({ data: { ...scope, text, url, official } });
      onSaved({
        ...slide,
        sections: saved.sections,
        topic_recovery: { status: saved.mode, sourceUrl: saved.sourceUrl },
      });
      setNotice(
        "Saved and confirmed. These topic notes will be reused after refresh and regeneration.",
      );
      try {
        localStorage.removeItem(draftKey);
      } catch {}
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Save failed. Your draft remains here.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="my-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 print:hidden"
      aria-label={`Recover notes for ${slide.title}`}
    >
      <p className="font-semibold">{slide.title}</p>
      <p className="mt-1 text-sm text-slate-600">
        {slide.topic_recovery?.status === "missing"
          ? "This topic needs notes. The remaining chapter continues."
          : "Saved supplementary notes for this topic."}
      </p>
      <Button className="mt-3" variant="outline" onClick={() => setOpen(true)}>
        Teacher notes / Google search
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete this topic</DialogTitle>
            <DialogDescription>
              Class {klass} · {subject} · {chapter} · {slide.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold">1. Find matching text</h3>
              <label className="mt-2 block text-sm" htmlFor="topic-search">
                Class and topic search
              </label>
              <Input
                id="topic-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Google results
                  </a>
                </Button>
                <Button disabled={busy} onClick={() => find()}>
                  Find official text
                </Button>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Google results open in a separate tab. Extract text from a matching NCERT, SATHEE,
                CBSE or CIET page below.
              </p>
              <label className="mt-3 block text-sm" htmlFor="topic-source">
                Official page URL
              </label>
              <Input
                id="topic-source"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setOfficial(false);
                }}
                placeholder="https://…"
              />
              <Button
                className="mt-2"
                variant="outline"
                disabled={busy || !url}
                onClick={() => find(true)}
              >
                Extract matching topic text
              </Button>
            </div>
            {results.length > 0 && (
              <div>
                <h3 className="font-semibold">2. Preview and import</h3>
                {results.map((item) => (
                  <article key={item.url} className="my-3 rounded-lg border p-3">
                    <a
                      className="text-blue-700 underline"
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.title}
                    </a>
                    {item.lines.length ? (
                      <>
                        <ol className="my-3 list-decimal space-y-2 pl-5">
                          {item.lines.map((line, index) => (
                            <li key={index}>{line}</li>
                          ))}
                        </ol>
                        <Button
                          disabled={busy}
                          onClick={() => {
                            setText(item.lines.join("\n"));
                            setUrl(item.url);
                            setOfficial(true);
                            try {
                              localStorage.setItem(draftKey, item.lines.join("\n"));
                            } catch {}
                          }}
                        >
                          Import this text
                        </Button>
                      </>
                    ) : (
                      <p className="mt-2 text-sm">
                        A complete matching topic passage could not be extracted from this page.
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
            <div>
              <h3 className="font-semibold">3. Organise and save topic notes</h3>
              <label htmlFor="teacher-topic-text" className="my-2 block text-sm">
                Write one complete point or teaching step per line.
              </label>
              <Textarea
                id="teacher-topic-text"
                rows={10}
                value={text}
                onChange={(event) => edit(event.target.value)}
                placeholder="Write teacher notes for this topic here…"
              />
              <p className="my-2 text-sm text-slate-600">
                Drafts stay on this device. An administrator can permanently save notes for future
                lessons. Edited or written text is labelled Teacher notes.
              </p>
              <Button disabled={busy || text.trim().length < 10} onClick={preserve}>
                {busy ? "Working…" : "Save topic notes permanently"}
              </Button>
            </div>
            {notice && (
              <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm">
                {notice}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
