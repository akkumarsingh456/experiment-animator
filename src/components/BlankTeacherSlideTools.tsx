import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TopicTextPreview } from "./TopicTextPreview";
import { draftMissingTopicPoints } from "@/lib/missing-topic-ai.functions";
import type { Slide } from "@/lib/generate.functions";
type Props = {
  slide: Slide;
  klass: string;
  subject: string;
  chapter: string;
  onUpdate: (lines: string[]) => void;
  onDelete: () => void;
  saveStatus?: string;
  onRetrySave?: () => void;
};
export function BlankTeacherSlideTools({
  slide,
  klass,
  subject,
  chapter,
  onUpdate,
  onDelete,
  saveStatus,
  onRetrySave,
}: Props) {
  const [open, setOpen] = useState(false),
    [text, setText] = useState(""),
    [points, setPoints] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const draft = useServerFn(draftMissingTopicPoints);
  if (!slide.teacher_blank) return null;
  const topic = slide.teacher_blank.topic;
  function edit() {
    setText((slide.sections?.flatMap((section) => section.lines) || slide.bullets).join("\n"));
    setOpen(true);
    setNotice("");
  }
  async function ai() {
    setOpen(true);
    setBusy(true);
    setNotice("Drafting for the original topic…");
    try {
      const result = await draft({ data: { klass, subject, chapter, topic, recoveryOnly: true } });
      setPoints(result.lines);
      setNotice("Review the AI draft before importing it into this slide.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "AI draft failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="mx-3 my-1 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 print:hidden"
      aria-label="Added teacher slide controls"
    >
      <p className="text-sm font-medium">Teacher slide · {topic}{saveStatus&&<span role="status" className="ml-3 text-xs font-normal">{saveStatus}</span>}</p>
      <div className="flex flex-wrap gap-2">
        {saveStatus?.startsWith('Saving failed')&&onRetrySave&&<Button size="sm" variant="outline" onClick={onRetrySave}>Retry saving</Button>}
        <Button size="sm" variant="outline" onClick={edit}>
          Edit this slide
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setText(
              (slide.sections?.flatMap((section) => section.lines) || slide.bullets).join("\n"),
            );
            void ai();
          }}
        >
          Draft AI important points
        </Button>
        <Button size="sm" variant="outline" onClick={onDelete}>
          Delete this slide
        </Button>
      </div>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal
          container={
            typeof document !== "undefined"
              ? (document.fullscreenElement as HTMLElement) || undefined
              : undefined
          }
        >
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/70" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] grid max-h-[90dvh] w-[calc(100%_-_24px)] max-w-3xl -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border bg-background p-6 shadow-lg">
            <Dialog.Title className="pr-14 text-xl font-semibold">Edit teacher slide</Dialog.Title>
            <Dialog.Description className="text-sm text-slate-600">
              Class {klass} · {subject} · {chapter} · {topic}. Changes apply only to this added
              slide.
            </Dialog.Description>
            <Dialog.Close className="absolute right-3 top-3 rounded border px-2 py-1 text-sm">
              Close
            </Dialog.Close>
            <label className="text-sm">
              Notes for this slide
              <Textarea
                className="mt-2"
                rows={9}
                value={text}
                onChange={(event) => {setText(event.target.value);onUpdate(event.target.value.split(/\n+/).map(line=>line.trim()).filter(Boolean));}}
                placeholder="Write or paste notes here. One point per line."
              />
            </label>
            <label className="text-sm">
              Upload text notes (.txt)
              <input
                className="mt-2 block w-full text-sm"
                type="file"
                accept=".txt,text/plain"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (!file.name.toLowerCase().endsWith(".txt") || file.size > 200000) {
                    setNotice("Choose a .txt file smaller than 200 KB.");
                    return;
                  }
                  try {
                    const value=await file.text();setText(value);onUpdate(value.split(/\n+/).map(line=>line.trim()).filter(Boolean));
                    setNotice("Text loaded. Automatic saving status is shown below.");
                  } catch {
                    setNotice("The text file could not be read.");
                  }
                }}
              />
            </label>
            <Button variant="outline" disabled={busy} onClick={ai}>
              Draft AI important points
            </Button>
            {!!points.length && (
              <TopicTextPreview
                lines={points}
                subject={subject}
                disabled={busy}
                onImport={(lines) => {setText(lines.join("\n"));onUpdate(lines);}}
              />
            )}
            <Button
              disabled={busy}
              onClick={() => {
                const lines = text
                  .split(/\n+/)
                  .map((line) => line.trim())
                  .filter(Boolean);
                onUpdate(lines);
                setOpen(false);
              }}
            >
              Done
            </Button>
            {notice && (
              <p role="status" className="text-sm">
                {notice}
              </p>
            )}
            {saveStatus&&<p role="status" className="text-sm">{saveStatus}</p>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
