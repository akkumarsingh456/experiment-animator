import {TopicNotesChat} from "./TopicNotesChat";
import {AddedTopicNotes} from './AddedTopicNotes';
import {FilePlus2} from 'lucide-react';
import {slideNotesRequest} from '@/lib/slide-notes-request';
import {importedTopicDraft,importMissingTopicNotes,addedTopicLines} from "@/lib/missing-topic-import";
import { TopicTextPreview } from "@/components/TopicTextPreview";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  searchMissingTopic,
  readMissingTopicNotes,
} from "@/lib/topic-notes.functions";
import type { Slide } from "@/lib/generate.functions";

type Props = {
  compact?: boolean;
  iconOnly?: boolean;
  storageId?: string;
  onExtracted?:()=>void;
  saveStatus?: string;
  pageHeadings?: string[];
  onAddBlankSlide?: () => void;
  slide: Slide;
  klass: string;
  subject: string;
  chapter: string;
  onSaved: (slide: Slide) => void;
};
export function MissingTopicNotes({
  compact = false,
  iconOnly = false,
  storageId = '',
  onExtracted,
  saveStatus,
  pageHeadings,
  onAddBlankSlide,
  slide,
  klass,
  subject,
  chapter,
  onSaved,
}: Props) {
  const scope = { klass, subject, chapter, topic: slide.title };
  const draftKey = "missing-topic-draft:" + JSON.stringify([klass, subject, chapter, slide.title,...(storageId?[storageId]:[])]);
  const importKey = "missing-topic-import-v1:" + JSON.stringify([klass, subject, chapter, slide.title,...(storageId?[storageId]:[])]);
  const [open, setOpen] = useState(false),
    [action,setAction] = useState<'add'|'remove'>('add'),
    [text, setText] = useState(""),
    [url, setUrl] = useState(""),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [results, setResults] = useState<
      Array<{ url: string; title: string; lines: string[]; complete?: boolean }>
    >([]);
  const importedRef = useRef(false);
  const search = useServerFn(searchMissingTopic),
    read = useServerFn(readMissingTopicNotes);
  useEffect(() => {
    setQuery(`Class ${klass} ${subject} ${chapter} ${slide.title} NCERT notes`);
    try {
      setText(localStorage.getItem(draftKey) || "");
    } catch {}
    importedRef.current = !!slide.teacher_supplement;
    try {
      const draft=importedTopicDraft.safeParse(JSON.parse(localStorage.getItem(importKey)||"null"));
      if(draft.success&&!slide.teacher_supplement){importedRef.current=true;onSaved(importMissingTopicNotes(slide,draft.data.lines,draft.data.sources[0]?.url));}
    } catch {}
    let current = true;
    if(!slide.topic_recovery)return ()=>{current=false;};
    void read({ data: scope })
      .then((saved) => {
        if (current && saved && !importedRef.current) {
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
  function changePopup(value: boolean) {
    setOpen(value);

  }
  return (
    <section
      className={
        iconOnly ? 'inline-flex shrink-0 print:hidden' : compact
          ? "mx-3 my-1 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 print:hidden"
          : "my-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 print:hidden"
      }
      aria-label={`Recover notes for ${slide.title}`}
    >
      {!iconOnly&&<><p className="font-semibold">
        {slide.title}
        {compact && (
          <span className="ml-2 text-sm font-normal">
            {slide.topic_recovery?.status === "missing" ? "Needs notes" : "Supplementary notes"}
          </span>
        )}
      </p>
      <p className={compact ? "hidden" : "mt-1 text-sm text-slate-600"}>
        {slide.topic_recovery?.status === "missing"
          ? "This topic needs notes. The remaining chapter continues."
          : "Saved supplementary notes for this topic."}
      </p></>}
      <Button
        className={iconOnly ? 'h-9 w-9 p-0' : compact ? "h-8 text-sm" : "mt-3"}
        title={`Add or remove notes · ${slide.title}`}
        aria-label={`Add or remove notes for ${slide.title}`}
        variant="outline"
        onClick={() => changePopup(true)}
      >
        {iconOnly?<FilePlus2 size={17} aria-hidden="true"/>:'Add or remove notes'}
      </Button>
      <Dialog open={open} onOpenChange={changePopup}>
        <DialogPrimitive.Portal
          container={
            typeof document !== "undefined"
              ? (document.fullscreenElement as HTMLElement) || undefined
              : undefined
          }
        >
          <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-black/70" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[81] grid max-h-[90dvh] w-[calc(100%_-_24px)] max-w-3xl -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border bg-background p-6 shadow-lg">
            <DialogPrimitive.Close
              className="absolute right-3 top-3 rounded border px-2 py-1 text-sm"
              aria-label="Close topic notes"
            >
              Close
            </DialogPrimitive.Close>
            <DialogHeader>
              <DialogTitle className="pr-14 break-words">{slide.title} · Teacher notes</DialogTitle>
              <DialogDescription>
                Class {klass} · {subject} · {chapter} · {slide.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <p className="text-sm text-slate-600">Send a request, review the reply, then click Extract notes. Original textbook notes stay safe.</p>
              <div className="flex flex-wrap gap-2" aria-label="Choose notes action">
                <Button variant={action==='add'?'default':'outline'} aria-pressed={action==='add'} onClick={()=>setAction('add')}>Add notes</Button>
                <Button variant={action==='remove'?'default':'outline'} aria-pressed={action==='remove'} onClick={()=>setAction('remove')}>Remove added points ({addedTopicLines(slide).length})</Button>
              </div>
              <div hidden={action!=='remove'}><AddedTopicNotes subject={subject} lines={addedTopicLines(slide)} onChange={lines=>{
                importedRef.current=true;
                const sourceUrl=slide.teacher_supplement?.sourceUrl||slide.topic_recovery?.sourceUrl||'';
                const sources=sourceUrl?[{url:sourceUrl,title:'Supplementary notes reference'}]:[];
                onSaved(importMissingTopicNotes(slide,lines,sourceUrl));
                edit(lines.join('\n'));
                try{const value=JSON.stringify({lines,sources});localStorage.setItem(importKey,value);if(localStorage.getItem(importKey)!==value)throw new Error('Save not confirmed');setNotice('Added notes updated and saved on this device.');}
                catch{setNotice('Notes updated in the open lesson, but device saving failed. Keep this lesson open.');}
                onExtracted?.();
              }}/>
              </div>
              <div hidden={action!=='add'}><TopicNotesChat sourceText={slide.chapter_text} previewKey={draftKey} scope={scope} preset={slideNotesRequest(slide,{klass,subject,chapter},pageHeadings)} onExtract={(lines,sources)=>{
                lines=[...new Set([...addedTopicLines(slide),...lines])];
                if(lines.length>500){setNotice('This slide already has many added points. Use Add blank slide for the next set; existing notes are preserved.');return false;}
                importedRef.current=true;
                const updated=importMissingTopicNotes(slide,lines,sources[0]?.url);
                onSaved(updated);
                onExtracted?.();
                edit(lines.join("\n"));
                setUrl(sources[0]?.url||"");
                try{const value=JSON.stringify({lines,sources});localStorage.setItem(importKey,value);if(localStorage.getItem(importKey)!==value)throw new Error('Save not confirmed');setNotice("Added to this topic and saved on this device. Extra slides adjust automatically.");}
                catch{setNotice("Extracted into this lesson. Device saving failed; save the lesson to your workspace before leaving.");}
              }}/>
              </div>
              {saveStatus&&<p role="status" className="text-xs text-slate-600">{saveStatus}</p>}
              {onAddBlankSlide&&<Button variant="outline" disabled={busy} onClick={onAddBlankSlide}>Add blank slide</Button>}
              <details><summary className="cursor-pointer font-semibold text-sky-900">More options: source links and device drafts</summary>
              <div className="mt-4 space-y-5">
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
                    Search notes here
                  </Button>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Matching official-source notes appear below as text. Google search opens
                  separately; its result snippets are not used as lesson notes.
                </p>
                <label className="mt-3 block text-sm" htmlFor="topic-source">
                  Official page URL
                </label>
                <Input
                  id="topic-source"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
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
              {(open || results.length > 0) && (
                <div>
                  <h3 className="font-semibold">2. Read source notes and import</h3>
                  {busy && (
                    <p role="status" className="my-3 text-sm">
                      Searching matching official pages and extracting topic text…
                    </p>
                  )}
                  {!busy && !results.length && (
                    <p className="my-3 text-sm">
                      No readable matching source was returned. Try Search notes here again, or add
                      an official source link.
                    </p>
                  )}
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
                          {item.complete === false && (
                            <p className="mt-2 text-sm text-amber-800">
                              Partial source passage. Review and complete it as teacher notes before
                              saving.
                            </p>
                          )}
                          <TopicTextPreview
                            key={JSON.stringify(item.lines)}
                            lines={item.lines}
                            subject={subject}
                            disabled={busy}
                            onImport={(passages, wholePassage) => {
                              setText(passages.join("\n"));
                              setUrl(item.url);
                              try {
                                localStorage.setItem(draftKey, passages.join("\n"));
                              } catch {}
                            }}
                          />
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
                <h3 className="font-semibold">3. Optional device draft</h3>
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
                  This is a device draft. To add these points to your lesson, copy them into Review notes above and choose Extract notes. Shared source books and permanent source notes are locked.
                </p>
              </div>
              </div></details>
              {notice && (
                <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm">
                  {notice}
                </p>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </Dialog>
    </section>
  );
}
