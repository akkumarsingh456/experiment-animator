import { EducationHomepage } from "@/components/EducationHomepage";
import { ENGLISH_CHAPTERS } from "@/lib/english-chapters";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

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
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Search,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import {
  SYLLABUS_CLASSES,
  subjectsForClass,
  chaptersFor,
  subtopicsFor,
} from "@/lib/ncert-syllabus";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduPlan — NCERT Lesson Preparation for Classes 9–12" },
      { property: "og:title", content: "EduPlan — NCERT Lessons for Classes 9–12" },
      { property: "og:description", content: "Create NCERT-grounded lessons with original book screenshots, diagrams and teacher notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Prepare textbook-based notes, diagrams, classroom activities and presentations for Classes 9–12. Review lessons and export PDF or PowerPoint files." },
    ],
  }),
  component: Landing,
});

const CLASSES = SYLLABUS_CLASSES;

const LANGUAGE_SUBJECTS = ["English", "Hindi", "Sanskrit"];
function isLang(s: string) { return LANGUAGE_SUBJECTS.includes(s); }

function GeneratorBlock() {
  const nav = useNavigate();

  const [topic, setTopic] = useState("");
  const [klass, setKlass] = useState("10");
  const [subject, setSubject] = useState("Science");
  const [chapter, setChapter] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const lang = isLang(subject);

  // Every dropdown is driven strictly by the built-in NCERT syllabus.
  const subjects = useMemo(() => subjectsForClass(klass).filter((name) => !LANGUAGE_SUBJECTS.includes(name)), [klass]);
  const chapters = useMemo(() => chaptersFor(klass, subject), [klass, subject]);
  const subOptions = useMemo(
    () => (chapter ? subtopicsFor(klass, subject, chapter) : []),
    [klass, subject, chapter],
  );
  const chaptersLoading = false;
  const subLoading = false;

  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [customSub, setCustomSub] = useState("");

  // Keep the subject valid for the selected class.
  useEffect(() => {
    if (!subjects.includes(subject)) setSubject(subjects[0] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klass, subjects]);

  // Reset chapter/topic/subtopics whenever class or subject changes.
  useEffect(() => {
    setChapter("");
    setTopic("");
    setSelectedSubs([]);
  }, [klass, subject]);

  // Reset subtopic ticks when the chapter changes.
  useEffect(() => { setSelectedSubs([]); }, [chapter]);


  const finalTopic = useMemo(() => {
    if (lang) return (chapter || customTopic).trim();
    // Chapter alone is enough — the topic field only narrows it further.
    return (topic || chapter || customTopic).trim();
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
    <Card className="lesson-builder border-border/60 shadow-soft overflow-hidden">
      <CardContent className="lesson-builder-content p-6 sm:p-8">
        <div className="lesson-builder-heading flex items-center gap-2 mb-4">
          <div className="lesson-builder-mark h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
            <Search className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-lg leading-tight">Prepare your NCERT lesson</h3>
            <p className="text-xs text-muted-foreground">
              {lang
                ? "Language mode · full chapter, verbatim NCERT text with break slides + MCQs"
                : "Choose your textbook chapter, set the topics and prepare notes with practice questions."}
            </p>
          </div>
        </div>

        <ol className="lesson-builder-guide" aria-label="Lesson preparation steps"><li><span>01</span>Class & subject</li><li><span>02</span>Chapter & topics</li><li><span>03</span>Prepare your lesson</li></ol>
        <div className="lesson-builder-fields grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Class</label>
            <Select value={klass} onValueChange={setKlass}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="lesson-builder-menu">
                {CLASSES.map((c) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="lesson-builder-menu">
                {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Chapter dropdown — from the built-in NCERT syllabus */}
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              Chapter {chaptersLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              <span className="text-[10px] text-muted-foreground/70">
                ({chapters.length} in the NCERT syllabus for Class {klass} · {subject})
              </span>
            </label>
            {chapters.length > 0 ? (
              <Select value={chapter} onValueChange={setChapter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a chapter from the NCERT syllabus" />
                </SelectTrigger>
                <SelectContent className="lesson-builder-menu max-h-72">
                  {subject === "English" ? [...new Set((ENGLISH_CHAPTERS[klass] || []).map(c => c.book))].map(book => (
                    <SelectGroup key={book}>
                      <SelectLabel>{book}</SelectLabel>
                      {(ENGLISH_CHAPTERS[klass] || []).filter(c => c.book === book).map(c => (
                        <SelectItem key={c.chapter} value={c.chapter}>{c.chapter}</SelectItem>
                      ))}
                    </SelectGroup>
                  )) : chapters.map((c) => (
                    <SelectItem key={c.chapter} value={c.chapter}>{c.chapter}</SelectItem>
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
                  <ScrollArea className="lesson-subtopics mt-1 h-40 rounded-md border border-border/60 bg-card/50 p-3">
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
                    {chapter ? "No subtopics listed for this chapter — add your own below." : "Select a chapter to see its NCERT subtopics."}
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
                  <Button type="button" variant="outline" size="icon" aria-label="Add custom subtopic" onClick={addCustomSub}>
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
          className="lesson-builder-submit w-full mt-5 rounded-xl h-12 shadow-sm"
        >
          <BookOpen className="h-4 w-4" />
          {lang ? "Generate full chapter PPT + MCQs" : "Prepare lesson & activities"}
        </Button>

        <p className="mt-3 text-xs text-muted-foreground text-center">
          Your class, subject and chapter guide retrieval from uploaded material. Review the lesson against the original textbook before presenting.
        </p>
      </CardContent>
    </Card>
  );
}

function Landing() {
  return <EducationHomepage generator={<GeneratorBlock />} />;
}
