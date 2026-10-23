import {BlankTeacherSlideTools} from "@/components/BlankTeacherSlideTools";
import {TeacherPyqPanel} from '@/components/TeacherPyqPanel';
import {addBlankTeacherSlide} from "@/lib/blank-teacher-slide";
import {useSavedBlankSlides} from '@/hooks/use-saved-blank-slides';
import {blankSlidesKey} from '@/lib/saved-blank-slides';
import {useTeachingBookmark} from '@/hooks/use-teaching-bookmark';
import {TeachingBookmarkControls} from '@/components/TeachingBookmarkControls';
import type {BookmarkPage} from '@/lib/teaching-bookmark';
import {TeacherCloudSave} from '@/components/TeacherCloudSave';
import {TeacherPlanEditor} from '@/components/TeacherPlanEditor';
import {NextClassPlanCanvas} from '@/components/NextClassPlanCanvas';
import {useNextClassPlan} from '@/hooks/use-next-class-plan';
import {nextClassPlanSlide,withNextClassPlan,withoutNextClassPlan,nextClassPdfSlides,NEXT_CLASS_TITLE} from '@/lib/next-class-plan';
import {loadTeacherLesson} from '@/lib/teacher-workspace.functions';
import {captureWorkspace,restoreWorkspace} from '@/lib/teacher-workspace-device';
import {workspaceSnapshotSchema,workspaceActionSchema} from '@/lib/teacher-workspace';
import {supabase} from '@/integrations/supabase/client';
import {MissingTopicNotes} from '@/components/MissingTopicNotes';
import {exactSlideVisualId} from "@/lib/exact-slide-visual";
import {orderTopicSections} from "@/lib/topic-lecture-order";
import {NotesContentCheck} from "@/components/NotesContentCheck";
import {ncertNotesDisplaySlide} from "@/lib/ncert-display-cleanup";
import {polishChemistryPresentation} from "@/lib/chemistry-note-presentation";
import {withPhysicalChemistryRevision, PHYSICAL_REVISION} from "@/lib/physical-chemistry-revision";
import {SourceIndexReview} from "@/components/SourceIndexReview";
import {readableIndexPresentation} from "@/lib/source-index-presentation";
import {hasMeaningfulSlide} from "@/lib/slide-space-organizer";
import {SlideLayoutCheck} from '@/components/SlideLayoutCheck';
import {layoutKey,materializeLayout} from '@/lib/slide-layout-check';
import { socialNotesPresentationSlide } from "@/lib/social-note-presentation";
import { prepareTeacherPdfPages } from "@/lib/teacher-pdf-pages";
import { LESSON_REQUEST_TIMEOUT_MS } from "@/lib/generation-timing";
import { LessonPreparation } from "@/components/LessonPreparation";
import { withPhysicsFormulaReference } from "@/lib/physics-formula-reference";
import { sequenceChemistryNotes } from "@/lib/chemistry-note-sequence";
import { LessonCover } from "@/components/LessonCover";
import { withPhysicsDimensions } from "@/lib/physics-dimensions";
import {startChapterPreparation,bookPreparationSnapshot,subscribeBookPreparation,pauseBookPreparation} from '@/lib/book-preparation';
import { loadLessonBookPictures } from "@/lib/lesson-book-pictures.functions";
import { mergeLessonBookPictures } from "@/lib/lesson-book-pictures";
import { mergeMedEasySupplements } from "@/lib/med-easy-supplements";
import { lessonIllustrationCaption } from "@/lib/napkin-infographic";

import {ManualVisualEditor} from '@/components/ManualVisualEditor';
import {loadManualVisuals} from '@/lib/manual-visuals';
import { BookReferenceFigures } from "@/components/BookReferenceFigures";
import { BookMapSlide } from "@/components/BookMapSlide";
import { MathematicsTopicVisual } from "@/components/MathematicsTopicVisual";
import { isMathematics, mathematicsPresentationSlide } from "@/lib/mathematics-presentation";
import { omitContentsListings } from "@/lib/note-source-noise";
import { topicEvidence } from "@/lib/topic-evidence";
import { ExperimentLab } from "@/components/ExperimentLab";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  generateLesson,
  generateSlideImage,
  type GenerationResult,
  type Slide,
} from "@/lib/generate.functions";
import { SimulationViewer } from "@/components/SimulationViewer";
import { SimulationOverrideEditor } from "@/components/SimulationOverrideEditor";
import { pickSimulations } from "@/config/simulations";
import { slideKey, useSimOverride } from "@/lib/sim-overrides";
import {

  Atom,
  Beaker,
  Brain,
  Cpu,
  Dna,
  FlaskConical,
  Sigma,
  Heart,
  Leaf,
  Lightbulb,
  Magnet,
  Microscope,
  Orbit,
  Triangle,
  Ruler,
  Zap,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Pencil,
  Loader2,
  ArrowLeft,
  Sparkles,
  Play,
  GraduationCap,
} from "lucide-react";

import { repairSourceMathSlide } from "@/lib/source-math-repair";
import { MathText } from "@/components/MathText";
import { PenPaperEditor } from "@/components/PenPaperEditor";
import { usePenNotes, getPenNotes } from "@/lib/pen-notes";
import PagedNoteSections from "@/components/PagedNoteSections";
import { GuidedLessonNotes } from "@/components/GuidedLessonNotes";
import { DEFAULT_LECTURE_ROWS, paginateLectureSections } from "@/lib/lecture-pages";
import { GuidedNotesPresentation } from "@/components/GuidedNotesPresentation";
import { downloadLessonPdf } from "@/lib/lesson-pdf";
import { renderLessonIllustrationDataUrl } from "@/lib/napkin-infographic";
import { prepareSlideExport, downloadRenderedPptx } from "@/lib/lesson-slide-export";

type NoteSectionUI = { heading: string; kind: string; lines: string[] };

/**
 * Teacher's pen & paper block — hand-written formulas typeset in LaTeX by
 * Groq Vision and saved permanently against this slide.
 */
function PenNotesBlock({
  index,
  slide,
  subject,
  topic,
  editable,
  scale,
}: {
  index: number;
  slide: Slide;
  subject?: string;
  topic?: string;
  editable?: boolean;
  scale?: "card" | "present";
}) {
  const key = slideKey(subject, index, slide.title || "");
  const { lines, save } = usePenNotes(key);
  if (!lines.length && !editable) return null;
  const base = scale === "present" ? "text-[clamp(12px,1.2vw,18px)]" : "text-[12.5px]";
  return (
    <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 px-2.5 py-2 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[9px] font-semibold uppercase tracking-wider text-primary">
          Teacher's board · LaTeX
        </div>
        {editable && (
          <PenPaperEditor lines={lines} onSave={save} subject={subject} topic={topic || slide.title} />
        )}
      </div>
      {lines.length > 0 && (
        <ul className={`${base} leading-snug space-y-1 text-foreground/90`}>
          {lines.map((l, k) => (
            <li key={k}>• <MathText text={l} /></li>
          ))}
        </ul>
      )}
    </div>
  );
}




const SearchSchema = z.object({
  topic: z.coerce.string().default(""),
  subtopics: z.coerce.string().default(""),
  klass: z.coerce.string().default("10"),
  subject: z.coerce.string().default("Science"),
  chapter: z.coerce.string().default(""),
  mode: z.enum(["topic", "chapter"]).default("topic"),
  go: z.coerce.string().default(""),
  workspaceId: z.union([z.string().uuid(),z.literal('')]).default(''),
  workspaceAction: workspaceActionSchema.default('open'),
});

const LANGUAGE_SUBJECTS = ["english", "hindi", "sanskrit"];
function isLanguageSubject(subject?: string) {
  const s = (subject || "").toLowerCase();
  return LANGUAGE_SUBJECTS.some((l) => s.includes(l));
}

export const Route = createFileRoute("/generate")({
  validateSearch: SearchSchema,
  head: () => ({
    meta: [
      { title: "Generated NCERT Lesson | EduPlan AI" },
      { name: "description", content: "View a paginated NCERT lesson with Teacher Notes, formulas, derivations, diagrams, and simulations." },
      { property: "og:title", content: "Generated NCERT Lesson | EduPlan AI" },
      { property: "og:description", content: "A screen-fitted NCERT lesson with paginated Teacher Notes, formulas, derivations, diagrams, and simulations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GeneratePage,
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  atom: Atom, beaker: Beaker, leaf: Leaf, magnet: Magnet, microscope: Microscope,
  flask: FlaskConical, dna: Dna, lightbulb: Lightbulb, function: Sigma,
  circuit: Cpu, planet: Orbit, ruler: Ruler, prism: Triangle, heart: Heart,
  brain: Brain, bolt: Zap,
};

function GeneratePage() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const run = useServerFn(generateLesson);
  const startedRequest=useRef('');
  const requestIdRef = useRef(0);
  const [retryAttempt, setRetryAttempt] = useState(0);
  useEffect(() => () => { requestIdRef.current += 1;startedRequest.current=''; }, []);
  const [loading, setLoading] = useState(false);
  const [requestStartedAt, setRequestStartedAt] = useState(0);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const privateOwner=useRef<string|null>(null);
  const [workspaceNotice,setWorkspaceNotice]=useState('');
  const [preparedOwnerEmail,setPreparedOwnerEmail]=useState('');
  useEffect(()=>{if(!search.workspaceId)return;const {data}=supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||event==='SIGNED_IN'&&privateOwner.current&&session?.user.id!==privateOwner.current){requestIdRef.current++;startedRequest.current='';privateOwner.current=null;setResult(null);setLoading(false);setError('Sign in to the account that owns this private lesson, then reopen it from My teaching workspace.');}});return()=>data.subscription.unsubscribe();},[search.workspaceId]);

  useEffect(() => {
    if (!search.topic || (!search.workspaceId&&search.go !== "1" && retryAttempt === 0)) return;
    const requestKey=`${search.workspaceId}|${search.topic}|${search.klass}|${search.subject}|${search.go}|${retryAttempt}`;
    if(startedRequest.current===requestKey)return;
    startedRequest.current=requestKey;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setRequestStartedAt(Date.now());
    setLoading(true);
    setError(null);
    setPreparedOwnerEmail('');
    if(search.workspaceId){setResult(null);privateOwner.current=null;}
    let timeout: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error("This request took too long. Please retry; any completed lesson is saved and will be reused.")), LESSON_REQUEST_TIMEOUT_MS);
    });
    const request=search.workspaceId?(async()=>{const saved=await loadTeacherLesson({data:{id:search.workspaceId}});const snapshot=workspaceSnapshotSchema.parse(JSON.parse(saved.snapshotJson));const {data:session}=await supabase.auth.getSession();if(session.session?.user.id!==saved.ownerId)throw new Error('Your account changed. Reopen this lesson from My teaching workspace.');for(const field of ['klass','subject','chapter','topic','subtopics','mode'] as const)if(snapshot.scope[field]!==search[field])throw new Error('Open this saved lesson from My teaching workspace to use its correct class and chapter.');privateOwner.current=saved.ownerId;const restored=await restoreWorkspace(snapshot);if(requestIdRef.current===requestId)setWorkspaceNotice(restored.warnings.join(' '));return restored.lesson;})():run({data:search});
    Promise.race([request, deadline])
      .then(r => prepareTeacherPdfPages(r as GenerationResult))
      .then((prepared) => {if(requestIdRef.current!==requestId)return;setResult(prepared);if(!search.workspaceId)void(async()=>{try{const {data:session}=await supabase.auth.getSession();if(session.session){const {data,error}=await supabase.auth.getUser();if(!error&&requestIdRef.current===requestId)setPreparedOwnerEmail(data.user?.email||'');}}catch{/* Public notes remain usable when account access is unavailable. */}})();})
      .catch((e) => { if (requestIdRef.current === requestId) setError(e?.message ?? String(e)); })
      .finally(() => { clearTimeout(timeout); if (requestIdRef.current === requestId) setLoading(false); });
    // Clear the one-shot URL trigger while retaining the pending request.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("go", "");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
    // Clearing go must not invalidate this request: its result still belongs to this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.go, search.workspaceId, retryAttempt]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border/60 print:hidden">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground grid place-items-center">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-display font-extrabold tracking-tight">EduPlan AI</span>
          </Link>
          <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="h-4 w-4" />New search</Link></Button>
        </div>
      </header>

      <div className="w-[min(96vw,1650px)] mx-auto px-2 sm:px-3 py-5 print:w-auto print:mx-0 print:p-0">
        <div className="flex flex-wrap items-center gap-2 mb-6 print:hidden">
          <Badge variant="secondary" className="rounded-full"><Sparkles className="h-3.5 w-3.5" />Class {search.klass}</Badge>
          <Badge variant="outline" className="rounded-full">{search.subject}</Badge>
          {search.chapter && <Badge variant="outline" className="rounded-full">Ch. {search.chapter}</Badge>}
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight ml-1">{search.topic || "Untitled"}</h1>
        </div>

        {loading && <LessonPreparation startedAt={requestStartedAt} klass={String(search.klass||'')} subject={search.subject} chapter={search.chapter} topic={search.topic} />}

        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-6">
              <p className="font-semibold text-destructive">{search.workspaceId?'Private lesson could not be opened':'Generation failed'}</p>
              <p className="text-sm mt-1">{error}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setRetryAttempt(value => value + 1)}>{search.workspaceId?'Retry opening saved lesson':'Retry generation'}</Button>
                {search.workspaceId&&<Button asChild size="sm" variant="outline"><Link to="/workspace">My teaching workspace</Link></Button>}
                <Button size="sm" onClick={() => nav({ to: "/history" })}>Browse uploaded books</Button>
                <Button size="sm" variant="outline" onClick={() => nav({ to: "/" })}>Back home</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {workspaceNotice&&<p role="status" className="my-3 text-sm">{workspaceNotice}</p>}
        {result && <ResultView key={JSON.stringify(search)} result={result} title={search.topic} preparedOwnerEmail={preparedOwnerEmail} />}
      </div>
    </div>
  );
}

function ResultView({ result, title, preparedOwnerEmail }: { result: GenerationResult; title: string; preparedOwnerEmail:string }) {
  const search = Route.useSearch();
  const genImage = useServerFn(generateSlideImage);
  const makeCoverSlide = (): Slide => {
    const objectives = String(search.subtopics || "")
      .split(/[,;\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    return {
      title: String(search.chapter || title || search.topic || "Lesson overview").trim(),
      bullets: objectives.length ? objectives : [String(search.topic || title || "Lesson topic").trim()],
      notes: [],
      key_terms: [],
      visual: "cover",
      kind: "break",
      caption: `Class ${search.klass} · ${search.subject} · Chapter overview`,
    };
  };
  const withCoverSlide = (items: Slide[]) => {
    const sourceLines = (slide: Slide) => [slide.chapter_text || '', slide.grounding || '', slide.ncert_quote || '',
      ...slide.bullets, ...slide.notes, ...(slide.sections || []).filter(section => section.kind !== 'diagram').flatMap(section => section.lines)]
      .flatMap(line => line.split(/\n\s*\n|(?<=[.!?])\s+(?=\p{Lu})/u)).filter(line => line.trim());
    const available = items.flatMap(sourceLines);
    const repaired = items.map(slide => socialNotesPresentationSlide(slide, search.subject)).map(omitContentsListings).map(slide => {
      if (slide.kind === 'break' || slide.kind === 'mcq' ||
        slide.sections?.some(section => section.kind !== 'diagram' && section.lines.some(line => line.trim()))) return slide;
      const own = sourceLines(slide);
      const recovered = [...new Set(own.length ? own : topicEvidence(slide.title, available))];
      const missing = `Readable source text for ${slide.title} is unavailable. Re-ingest the matching chapter PDF from Upload, then regenerate this lesson.`;
      return { ...slide, sections: [{ heading: recovered.length ? 'Teacher Notes' : 'Source text needs attention', kind: 'bullets' as const,
        lines: recovered.length ? recovered : [missing] }],
        caption: recovered.length ? (slide.caption?.includes('No readable topic evidence') ? 'Recovered from saved lesson source text.' : slide.caption) : 'Source text needs attention for this topic.' };
    });
    return [makeCoverSlide(), ...withPhysicsFormulaReference(repaired, search.klass, search.subject, search.chapter || title).map(slide => mathematicsPresentationSlide(slide, result.source_books[0]?.subject || search.subject)).map(repairSourceMathSlide).map(slide => ({...slide, sections: sequenceChemistryNotes(slide.sections, search.subject || "", search.chapter || slide.title)}))];
  };
  const blankBase = useMemo(() => search.workspaceId?[makeCoverSlide(),...result.slides]:withCoverSlide(result.slides), [result]);
  const lessonDeviceKey = blankSlidesKey([String(search.klass), search.subject, search.chapter || title, search.topic, search.subtopics || '', search.mode || '']);
  const blankStore = useSavedBlankSlides(blankBase, lessonDeviceKey);
  const teachingBookmark = useTeachingBookmark(lessonDeviceKey);
  const [resumeTeaching, setResumeTeaching] = useState(false);
  const nextPlan=useNextClassPlan(search.workspaceId||'');
  const planSlide=useMemo(()=>nextClassPlanSlide(nextPlan.plan,{klass:String(search.klass),subject:search.subject,chapter:search.chapter||title},nextPlan.lessonId),[nextPlan.plan,nextPlan.lessonId,search.klass,search.subject,search.chapter,title]);
  const slides=useMemo(()=>withNextClassPlan(blankStore.slides,planSlide),[blankStore.slides,planSlide]);
  const setSlides=(action:Parameters<typeof blankStore.setSlides>[0])=>blankStore.setSlides(current=>withoutNextClassPlan(typeof action==='function'?action(current):action));
  function renderNextClassEditor(forceOpen=false){return nextPlan.lessonId&&nextPlan.owner&&!nextPlan.loading&&!nextPlan.error?<TeacherPlanEditor key={JSON.stringify([nextPlan.owner,nextPlan.lessonId])} lessonId={nextPlan.lessonId} ownerEmail={nextPlan.owner} record={nextPlan.record} value={nextPlan.plan} onDraftChange={nextPlan.change} topicHint={search.subtopics||search.topic} onSaved={nextPlan.saved} forceOpen={forceOpen}/>:null;}
  const blankSlideToShow=useRef<string|null>(null);
  function addRecoverySlide(topicTitle:string){
    const added=addBlankTeacherSlide(slides,topicTitle,blankStore.deleted?[blankStore.deleted.slide.title]:[]);if(added.index<0)return;
    blankSlideToShow.current=added.slides[added.index].title;
    setSlides(added.slides);setActiveIdx(added.index);setLessonView('slides');
  }
  function undoBlankSlide(){if(blankStore.deleted)blankSlideToShow.current=blankStore.deleted.slide.title;blankStore.undo();}
  function renderTopicRecovery(topicTitle:string){
    if(topicTitle===NEXT_CLASS_TITLE&&planSlide)return renderNextClassEditor(true);
    const undoControl=blankStore.deleted?<div className="mx-3 my-1 flex flex-wrap items-center gap-2 rounded-lg border bg-sky-50 p-2 text-sm print:hidden"><span role="status">{blankStore.status}</span><Button size="sm" variant="outline" onClick={undoBlankSlide}>Undo delete · {blankStore.deleted.slide.title}</Button></div>:null;
    const blank=slides.find(item=>item.teacher_blank&&item.title.trim()===topicTitle.trim());
    if(blank)return <>{undoControl}<BlankTeacherSlideTools key={blank.teacher_blank!.id} slide={blank} klass={String(search.klass)} subject={search.subject} chapter={search.chapter||title} saveStatus={blankStore.status} onRetrySave={blankStore.retrySave} onUpdate={lines=>setSlides(current=>current.map(item=>item.teacher_blank?.id===blank.teacher_blank!.id?{...item,bullets:[],notes:[],sections:lines.length?[{heading:'Teacher notes',kind:'bullets' as const,lines}]:[]}:item))} onDelete={()=>blankStore.remove(blank.teacher_blank!.id)}/></>;

    const slide=slides.find(item=>item.topic_recovery&&item.title.trim()===topicTitle.trim());
    return <>{undoControl}{slide?<MissingTopicNotes onAddBlankSlide={()=>addRecoverySlide(slide.title)} compact key={slide.title} slide={slide} klass={String(search.klass)} subject={search.subject} chapter={search.chapter||title} onSaved={updated=>setSlides(current=>current.map(item=>item.title===slide.title&&item.topic_recovery?{...item,sections:updated.sections,topic_recovery:updated.topic_recovery,notes_quality:updated.notes_quality,caption:updated.caption}:item))}/>:null}</>;
  }

  useEffect(()=>{const refresh=()=>setSlides(current=>[...current]);window.addEventListener('manual-visual-saved',refresh);void loadManualVisuals().catch(()=>{});return()=>window.removeEventListener('manual-visual-saved',refresh);},[]);
  const [bookCaptureBusy, setBookCaptureBusy] = useState(false);
  const [bookCaptureMessage, setBookCaptureMessage] = useState("");
  const bookCaptureRun = useRef<{ stopped: boolean } | null>(null);
  const captureEligible = /^(9|10|11|12)$/.test(search.klass.replace(/[^0-9]/g, "")) && !!search.subject;
  async function refreshBookPictures(run?: { stopped: boolean }) {
    const pictures = await loadLessonBookPictures({ data: { klass: search.klass, subject: search.subject, chapter: search.chapter || title, slides: slides.map(slide => ({ title: slide.title, kind: slide.kind, topic_text: [...slide.key_terms, ...slide.notes, ...slide.bullets, ...(slide.sections || []).filter(section => !section.heading.startsWith("Reference notes")).flatMap(section => section.lines)].join("\n").slice(0, 30000) })) } });
    if (!run || (bookCaptureRun.current === run && !run.stopped)) setSlides(current => mergeMedEasySupplements(mergeLessonBookPictures(current, pictures), pictures));
    return pictures.reduce((count, picture) => count + picture.visuals.length, 0);
  }
  async function captureBookPictures() {
    if (!captureEligible || (bookCaptureRun.current && !bookCaptureRun.current.stopped)) return;
    const run = { stopped: false }; bookCaptureRun.current = run;
    setBookCaptureBusy(true);
    const refresh = () => refreshBookPictures(run);
    try {
      setBookCaptureMessage("Loading original book screenshots for this chapter...");
      await refresh();
      await startChapterPreparation(search.klass,search.subject,search.chapter || title);
      const matched = await refresh();
      if (bookCaptureRun.current === run) setBookCaptureMessage(matched ? `${matched} saved book pictures matched to this chapter.` : bookPreparationSnapshot().message);
    } catch (error) {
      if (bookCaptureRun.current === run) setBookCaptureMessage(error instanceof Error ? error.message : "Book capture could not finish. Resume to try again.");
    } finally {
      run.stopped = true;
      if (bookCaptureRun.current === run) setBookCaptureBusy(false);
    }
  }
  useEffect(() => {
    // Only load prepared pictures here. The root reader starts before lessons
    // and survives navigation, so clicking Generate never starts a new scan.
    let active=true,lastRevision=bookPreparationSnapshot().revision;
    void refreshBookPictures().catch(()=>{});
    const update=()=>{const state=bookPreparationSnapshot();setBookCaptureBusy(state.busy);setBookCaptureMessage(state.message);if(state.revision!==lastRevision){lastRevision=state.revision;void refreshBookPictures().catch(()=>{});}};
    update();const unsubscribe=subscribeBookPreparation(()=>{if(active)update();});
    return ()=>{active=false;unsubscribe();if(bookCaptureRun.current)bookCaptureRun.current.stopped=true;bookCaptureRun.current=null;};
  }, [result]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [presentationPage, setPresentationPage] = useState(0);
  const [originalPage, setOriginalPage] = useState(0);
  const [guidedDisplay, setGuidedDisplay] = useState<"page" | "presentation">("page");
  const closePresentation = useCallback(() => setPresenting(false), []);
  const [exportMode, setExportMode] = useState<"notes" | "slides" | "guided-slides" | null>(null);
  const [exportPurpose,setExportPurpose]=useState<'pdf'|'pptx'>('pdf');
  const exportRef = useRef<HTMLDivElement>(null);
  const [exportProgress, setExportProgress] = useState("");
  const [readyDownloads, setReadyDownloads] = useState<Record<string, { url: string; filename: string }>>({});
  const setReadyDownload = (key: string, file: { url: string; filename: string }) => setReadyDownloads(current => ({ ...current, [key]: file }));
  const downloadCache = useRef(new Map<string, { slides: Slide[]; layoutKey:string; url: string; filename: string }>());
  useEffect(() => () => { downloadCache.current.forEach(file => URL.revokeObjectURL(file.url)); }, []);
  function savePreparedFile(file: { url: string; filename: string }) {
    const link = document.createElement("a"); link.href = file.url; link.download = file.filename;
    document.body.appendChild(link); link.click(); link.remove();
  }
  function rememberDownload(key: string, blob: Blob, filename: string) {
    const previous = downloadCache.current.get(key);
    if (previous) URL.revokeObjectURL(previous.url);
    const file = { slides, layoutKey:displayLayoutKey, url: URL.createObjectURL(blob), filename };
    downloadCache.current.set(key, file);
    savePreparedFile(file);
    return file;
  }
  const [editing, setEditing] = useState(false);
  const [lessonView, setLessonView] = useState<"notes" | "slides">("notes");
  function resumeTeachingBookmark(){if(!teachingBookmark.bookmark)return;setLessonView(teachingBookmark.bookmark.view);setResumeTeaching(true);}
  function clearTeachingBookmark(){setResumeTeaching(false);teachingBookmark.clear();}
  function renderTeachingBookmark(pages:BookmarkPage[],index:number,goTo:(index:number)=>void){return <TeachingBookmarkControls pages={pages} index={index} view={lessonView} bookmark={teachingBookmark.bookmark} status={teachingBookmark.status} resumeRequested={resumeTeaching} onSave={teachingBookmark.save} onResume={resumeTeachingBookmark} onClear={clearTeachingBookmark} onGoTo={goTo} onResumeDone={()=>setResumeTeaching(false)}/>;}
  useEffect(() => {
    document.body.dataset.lessonView = lessonView;
    return () => { delete document.body.dataset.lessonView; };
  }, [lessonView]);
  // English / Hindi / Sanskrit chapters have no experiment to verify —
  // the full chapter text is rendered straight away.
  const skipVerify = isLanguageSubject(String(search.subject || "")) || search.mode === "chapter";
  const [verified, setVerified] = useState(skipVerify);

  const [images, setImages] = useState<Record<number, string>>({});
  const [imgLoading, setImgLoading] = useState<Record<number, boolean>>({});
  type ImgStatus = { state: "pending" | "loading" | "cached" | "fresh" | "failed"; error?: string; at?: number; duplicateOf?: number; regenerated?: boolean };
  const [imgStatus, setImgStatus] = useState<Record<number, ImgStatus>>({});
  // Perceptual signatures (8x8 grayscale bit-hash) per slide, used to detect
  // repeated / near-identical 2D layouts across adjacent slides.
  const imgHashRef = useRef<Record<number, string>>({});
  const dupRetryRef = useRef<Record<number, number>>({});

  useEffect(() => { setVerified(skipVerify); setActiveIdx(0); setPresentationPage(0); setOriginalPage(0); setImages({}); setImgLoading({}); setImgStatus({}); imgHashRef.current = {}; dupRetryRef.current = {}; }, [result]);

  function updateSlide(idx: number, patch: Partial<Slide>) {
    setSlides((s) => s.map((sl, i) => (i === idx ? { ...sl, ...patch } : sl)));
  }

  /** Downscale an image to 8x8 grayscale and return a 64-bit average hash. */
  async function perceptualHash(url: string): Promise<string | null> {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const loaded = new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("load"));
      });
      img.src = url;
      await loaded;
      const N = 8;
      const canvas = document.createElement("canvas");
      canvas.width = N; canvas.height = N;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, N, N);
      const { data } = ctx.getImageData(0, 0, N, N);
      const grays: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        grays.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      }
      const avg = grays.reduce((a, b) => a + b, 0) / grays.length;
      return grays.map((g) => (g >= avg ? "1" : "0")).join("");
    } catch {
      return null;
    }
  }

  function hamming(a: string, b: string) {
    if (a.length !== b.length) return Infinity;
    let d = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
    return d;
  }

  /**
   * Returns the index of an earlier slide whose 2D layout is too close to
   * this one (identical URL, or perceptual hash within 6 bits of 64).
   */
  function findDuplicate(idx: number, url: string, hash: string | null): number | null {
    for (const [k, u] of Object.entries(images)) {
      const other = Number(k);
      if (other === idx) continue;
      if (u === url) return other;
    }
    if (!hash) return null;
    const neighbours = Object.entries(imgHashRef.current)
      .map(([k, h]) => [Number(k), h] as const)
      .filter(([other]) => other !== idx);
    for (const [other, h] of neighbours) {
      // Local renders share a banner + paper background, so only a near-exact
      // bit match (<=2 of 64) counts as a repeated layout.
      if (hamming(hash, h) <= 2) return other;
    }

    return null;
  }

  async function ensureImage(idx: number, opts: { force?: boolean; cacheOnly?: boolean } = {}): Promise<{ hasImage: boolean; state: ImgStatus["state"] }> {
    const { force = false, cacheOnly = false } = opts;
    if (!force && (images[idx] || imgLoading[idx])) return { hasImage: true, state: imgStatus[idx]?.state ?? "cached" };
    const s = slides[idx];
    if (!s) return { hasImage: false, state: "failed" };
    if(s.teacher_next_class)return {hasImage:true,state:'cached'};
    setImgLoading((m) => ({ ...m, [idx]: true }));
    setImgStatus((m) => ({ ...m, [idx]: { state: "loading" } }));
    try {
      const r = await genImage({ data: {
        title: s.title,
        chapter: search.chapter || title,
        bullets: s.bullets || [],
        notes: s.notes || [],
        key_terms: s.key_terms || [],
        sections: (s as any).sections || undefined,
        caption: s.caption || "",
        subject: search.subject,
        klass: search.klass,
        slideIndex: idx,
        avoidUrls: Object.entries(images).filter(([key]) => Number(key) !== idx).map(([, value]) => value),
        visual_prompt: s.visual_prompt || "",
        grounding: s.grounding || s.ncert_quote || "",
        nocache: force,
        cacheOnly,
      } });
      if (r.url) {
        // Duplicate-layout verification: compare against every other slide.
        const hash = await perceptualHash(r.url);
        const dup = findDuplicate(idx, r.url, hash);
        const tries = dupRetryRef.current[idx] ?? 0;
        if (hash) imgHashRef.current[idx] = hash;
        setImages((m) => ({ ...m, [idx]: r.url }));
        if (r.contextUrl) setSlides(current => current.map((slide,index)=>index===idx && slide.title===s.title ? { ...slide, context_illustration: { url:r.contextUrl!, provider:"Hugging Face" as const, description:`AI context illustration for ${s.title}; use the labelled diagram and source notes for exact relationships.` } } : slide));
        setImgStatus((m) => ({
          ...m,
          [idx]: {
            state: r.cached ? "cached" : "fresh",
            at: Date.now(),
            regenerated: (dupRetryRef.current[idx] ?? 0) > 0,
            duplicateOf: dup !== null ? dup : undefined,
          },
        }));
        return { hasImage: true, state: r.cached ? "cached" : "fresh" };
      } else if (cacheOnly) {
        // First-pass cache miss — leave as pending so second pass generates.
        setImgStatus((m) => ({ ...m, [idx]: { state: "pending" } }));
        return { hasImage: false, state: "pending" };
      } else {
        setImgStatus((m) => ({ ...m, [idx]: { state: "failed", error: r.error || "no_image", at: Date.now() } }));
        return { hasImage: false, state: "failed" };
      }
    } catch (e) {
      console.error("slide image failed", idx, e);
      const msg = e instanceof Error ? e.message : String(e);
      setImgStatus((m) => ({ ...m, [idx]: { state: "failed", error: msg, at: Date.now() } }));
      if (!cacheOnly) toast.error("Image generation failed — will retry.");
      return { hasImage: false, state: "failed" };
    } finally {
      setImgLoading((m) => ({ ...m, [idx]: false }));
    }
  }



  // Auto-generate the local 2D infographic for EVERY slide once verification
  // passes — regardless of subject (Physics, Chem, Bio, Math, Economics,
  // History, Geography, Political Science, and language chapters alike).
  // Results are cached in `slide_image_cache` keyed by class+subject+slide
  // metadata so repeat runs of the same lesson return instantly. We run 3
  // slides in parallel to keep the queue fast without hammering the gateway.
  useEffect(() => {
    if (!verified) return;
    let cancelled = false;
    const CONCURRENCY = 3;
    const indices = slides.map((_, i) => i);
    (async () => {
      // First pass: instant cache lookup for every slide (no API call).
      const cacheResults = await Promise.all(indices.map((i) => ensureImage(i, { cacheOnly: true })));
      const cacheReady = new Set(cacheResults.map((r, i) => (r.hasImage ? indices[i] : -1)).filter((i) => i >= 0));
      if (cancelled) return;
      // Second pass: generate fresh infographics for slides still missing one.
      let cursor = 0;
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (!cancelled) {
          const i = cursor++;
          if (i >= indices.length) return;
          // Skip slides where the first pass already populated an image.
          if (cacheReady.has(i)) continue;
          await ensureImage(i, { cacheOnly: false });
        }
      });
      await Promise.all(workers);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified, slides.length]);

  // Live progress indicator so the teacher can verify every subject/slide is
  // getting its 2D infographic auto-generated.
  const generatedCount = Object.values(images).filter(Boolean).length;
  const sourceVisualCount=slides.filter(slide=>!slide.teacher_next_class).length;
  const inFlightCount = Object.values(imgLoading).filter(Boolean).length;
  const cachedCount = Object.values(imgStatus).filter((s) => s.state === "cached").length;
  const freshCount = Object.values(imgStatus).filter((s) => s.state === "fresh").length;
  const failedCount = Object.values(imgStatus).filter((s) => s.state === "failed").length;
  const dupFixedCount = Object.values(imgStatus).filter((s) => s.regenerated).length;


  async function retryAllFailed() {
    const failedIdxs = Object.entries(imgStatus)
      .filter(([, s]) => s.state === "failed")
      .map(([k]) => Number(k));
    for (const i of failedIdxs) {
      // eslint-disable-next-line no-await-in-loop
      await ensureImage(i, { force: true });
    }
  }




  const [lectureRowWeights, setLectureRowWeights] = useState<Record<number, Record<string, number>>>({});
  useEffect(()=>{
    const reset=()=>setLectureRowWeights({});
    reset();window.addEventListener("resize",reset);
    return()=>window.removeEventListener("resize",reset);
  },[result]);
  const continueOverflowingNotes = useCallback((sourceIndex: number, ratio: number, lines: string[]) => {
    if (!Number.isFinite(ratio) || ratio <= 1 || !lines.length) return;
    setLectureRowWeights(previous => {
      const weights = {...previous[sourceIndex]};
      let changed = false;
      for (const line of new Set(lines)) {
        const current = weights[line] || 1;
        const next = Math.min(12, current * Math.max(1.1, Math.min(2, ratio)));
        if (next > current) { weights[line] = next; changed = true; }
      }
      return changed ? {...previous, [sourceIndex]: weights} : previous;
    });
  }, []);

  // Retain Lovable's notes-and-illustration layout independently of guided worksheets.
  const baseOriginalPages = useMemo(() => [...withPhysicalChemistryRevision(withoutNextClassPlan(slides), String(search.klass||""), search.subject||"", search.chapter||title),...slides.filter(slide=>slide.teacher_next_class)].flatMap((originalSlide, sourceIndex) => {
    if(originalSlide.teacher_next_class)return [{...originalSlide,sourceIndex}];
    const visualSlot=originalSlide.teacher_blank?`teacher-blank:${originalSlide.teacher_blank.id}`:`topic-slide:${slides.slice(0,sourceIndex).filter(item=>item.title.trim().toLowerCase()===originalSlide.title.trim().toLowerCase()).length}`;
    const slide=ncertNotesDisplaySlide(polishChemistryPresentation(readableIndexPresentation(originalSlide), search.subject||""),search.subject);
    if (!hasMeaningfulSlide(slide)) return [];
    if (slide.kind === "break" || slide.kind === "mcq") return [{ ...slide, sourceIndex }];
    const sections = slide.sections?.filter((section) => section.kind !== "diagram" && section.lines.some(line=>line.trim()));
    const fallback = slide.chapter_text ? slide.chapter_text.split(/\n\s*\n/).filter(Boolean) : [...slide.bullets, ...slide.notes];
    const sourceSections = sections?.length ? sections : [{ heading: "Teacher Notes", kind: "bullets", lines: fallback }];
    const notePages = paginateLectureSections(orderTopicSections(withPhysicsDimensions(sourceSections as NonNullable<Slide["sections"]>, search.subject || "", slide.title, true)), DEFAULT_LECTURE_ROWS, lectureRowWeights[sourceIndex]).map((page) => ({ ...slide, sections: page as Slide["sections"], sourceIndex, visualSlot,
      title: slide.title }));
    return notePages;
  }), [slides, search.klass, search.subject, search.chapter, title, lectureRowWeights]);
  const baselineLayoutKey=useMemo(()=>layoutKey(baseOriginalPages),[baseOriginalPages]);
  const [layoutPlan,setLayoutPlan]=useState<{key:string;groups:number[][]}|null>(null);
  const [layoutChecking,setLayoutChecking]=useState(true);
  const layoutGroups=useMemo(()=>layoutPlan?.key===baselineLayoutKey?layoutPlan.groups:baseOriginalPages.map((_,index)=>[index]),[baselineLayoutKey,layoutPlan]);
  const originalPages=useMemo(()=>materializeLayout(baseOriginalPages,layoutGroups),[baseOriginalPages,layoutGroups]);
  const displayLayoutKey=useMemo(()=>layoutKey(originalPages),[originalPages]);
  useEffect(()=>{if(!blankSlideToShow.current)return;const page=originalPages.findIndex(slide=>slide.title===blankSlideToShow.current);if(page>=0){setOriginalPage(page);blankSlideToShow.current=null;}},[originalPages]);

  useEffect(()=>setOriginalPage(current=>Math.min(current,Math.max(0,originalPages.length-1))),[originalPages.length]);
  const originalPresentationSlides = originalPages.map((slide, index) => ({ title: slide.title, section: "NCERT notes & illustration",
    content: <SlideCanvas slide={slide} index={index} total={originalPages.length} editing={false} onChange={() => {}} klass={search.klass} subject={search.subject} chapter={search.chapter || title} onNotesOverflow={continueOverflowingNotes} staticView />,
  }));
  const handledWorkspaceAction=useRef('');
  useEffect(()=>{
    if(!search.workspaceId||search.workspaceAction==='open'||!originalPages.length||nextPlan.loading||nextPlan.error)return;
    const key=`${search.workspaceId}:${search.workspaceAction}`;
    if(handledWorkspaceAction.current===key)return;
    handledWorkspaceAction.current=key;
    const url=new URL(window.location.href);url.searchParams.delete('workspaceAction');window.history.replaceState(window.history.state,'',`${url.pathname}${url.search}${url.hash}`);
    if(search.workspaceAction==='present'){setLessonView('slides');setPresenting(true);}
    else void downloadPDF('notes');
  },[search.workspaceId,search.workspaceAction,originalPages.length,nextPlan.loading,nextPlan.error]);

  async function downloadPDF(mode: "notes" | "slides" | "guided-slides" = lessonView) {
    if(nextPlan.loading||nextPlan.error){toast.info(nextPlan.error||'Loading the private next class plan. Please wait before downloading.');return;}
    if(mode==="slides"&&layoutChecking){toast.info("The free layout check is still running. Please wait for verification before downloading.");return;}
    await loadManualVisuals().catch(()=>{});
    if (exportMode) return;
    const cached = downloadCache.current.get(`pdf-${mode}`);
    if (cached?.slides === slides && cached.layoutKey===displayLayoutKey) { setReadyDownload(`pdf-${mode}`, cached); savePreparedFile(cached); return; }
    setExportPurpose('pdf');setExportMode(mode);
    setExportProgress("Preparing PDF...");
    let exportCopy: HTMLElement | undefined;
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!exportRef.current) throw new Error("The PDF pages are not ready.");
      exportCopy = exportRef.current.cloneNode(true) as HTMLElement;
      document.body.appendChild(exportCopy);
      if (mode !== "notes") await prepareSlideExport(exportCopy);
      await downloadLessonPdf(exportCopy, mode === "notes" ? "notes" : "slides", mode === "notes" ? title : `${title}-${mode === "guided-slides" ? "guided" : "ppt"}`, {
        onProgress: (done, total) => setExportProgress(`Preparing PDF: ${done} / ${total} pages`),
        onReady: (blob, filename) => {
          setReadyDownload(`pdf-${mode}`, rememberDownload(`pdf-${mode}`, blob, filename));
          toast.success("PDF ready. Use Save PDF if your browser did not download it automatically.");
        },
      });
    } catch (error) {
      toast.error(`PDF download failed: ${error instanceof Error ? error.message : "Please try again."}`);
    } finally { exportCopy?.remove(); setExportMode(null); setExportProgress(""); }
  }

  function presentSelectedView() {
    setPresenting(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  async function downloadPPTX(mode: "guided-slides" | "slides") {
    if(nextPlan.loading||nextPlan.error){toast.info(nextPlan.error||'Loading your next class plan. Please wait.');return;}
    if(mode==="slides"&&layoutChecking){toast.info("The free layout check is still running. Please wait for verification before downloading.");return;}
    await loadManualVisuals().catch(()=>{});
    if (exportMode) return;
    const key = `pptx-${mode}`;
    const cached = downloadCache.current.get(key);
    if (cached?.slides === slides && cached.layoutKey===displayLayoutKey) { setReadyDownload(key, cached); savePreparedFile(cached); return; }
    setExportProgress("Preparing PowerPoint...");
    setExportPurpose('pptx');setExportMode(mode);
    let exportCopy: HTMLElement | undefined;
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!exportRef.current) throw new Error("The slides are not ready.");
      exportCopy = exportRef.current.cloneNode(true) as HTMLElement;
      document.body.appendChild(exportCopy);
      await downloadRenderedPptx(exportCopy, `${title}-${mode === "guided-slides" ? "guided-notes" : "ppt"}`, {
        onProgress: (done, total) => setExportProgress(`Preparing PowerPoint: ${done} / ${total} slides`),
        onReady: (blob, filename) => {
          setReadyDownload(key, rememberDownload(key, blob, filename));
          toast.success("PowerPoint ready. Use Save PPTX if the automatic download did not start.");
        },
      });
    } catch (error) {
      toast.error(`PPTX export failed: ${error instanceof Error ? error.message : "Please try again."}`);
    } finally { exportCopy?.remove(); setExportMode(null); setExportProgress(""); }
  }


  return (
    <>
      <div className="lesson-view-controls flex flex-wrap items-center gap-2 mb-4 print:hidden" aria-label="Choose lesson view">
        <Button variant={lessonView === "notes" ? "default" : "outline"} aria-pressed={lessonView === "notes"} onClick={() => setLessonView("notes")}>Guided Notes</Button>
        <Button variant={lessonView === "slides" ? "default" : "outline"} aria-pressed={lessonView === "slides"} onClick={() => setLessonView("slides")}>Generate PPT &amp; Notes</Button>
        <Button variant="outline" onClick={presentSelectedView}><Maximize2 className="h-4 w-4" />Present {lessonView === "notes" ? "guided notes" : "PPT slides"}</Button>
        {teachingBookmark.bookmark&&<Button variant="outline" className="h-auto max-w-full whitespace-normal text-left" onClick={resumeTeachingBookmark}>Resume teaching · {teachingBookmark.bookmark.title}</Button>}
        {teachingBookmark.status&&<span role="status" className="text-sm">{teachingBookmark.status}</span>}
      </div>
      {(slides.some(slide=>slide.teacher_blank)||blankStore.deleted||blankStore.status.startsWith('Saving failed'))&&<div className="my-3 flex flex-wrap items-center gap-3 rounded-lg border bg-sky-50 p-3 text-sm print:hidden" aria-label="Added slide saving"><span role="status">{blankStore.status}</span>{blankStore.status.startsWith('Saving failed')&&<Button size="sm" variant="outline" onClick={blankStore.retrySave}>Retry saving</Button>}{blankStore.deleted&&<Button size="sm" variant="outline" onClick={undoBlankSlide}>Undo delete · {blankStore.deleted.slide.title}</Button>}</div>}
      <TeacherCloudSave onLessonSaved={nextPlan.setLessonId} initialId={search.workspaceId||undefined} preparedLesson={search.workspaceId?undefined:result} preparedScope={{klass:String(search.klass),subject:search.subject,chapter:search.chapter,topic:search.topic,subtopics:search.subtopics,mode:search.mode}} preparedOwnerEmail={preparedOwnerEmail} getSnapshot={()=>captureWorkspace({klass:String(search.klass),subject:search.subject,chapter:search.chapter,topic:search.topic,subtopics:search.subtopics,mode:search.mode},result,slides,blankStore.deleted,teachingBookmark.bookmark,nextPlan.lessonId)}/>
      <section className="my-3 rounded-xl border bg-sky-50/60 p-4 print:hidden" aria-label="Next Class Plan"><h3 className="font-semibold text-sky-900">Next Class Plan · optional final slide</h3>{nextPlan.loading?<p role="status" className="mt-2 text-sm">Loading your private teaching plan…</p>:nextPlan.error?<div className="mt-2 text-sm" role="alert">{nextPlan.error}<Button size="sm" variant="outline" onClick={nextPlan.retry}>Retry plan loading</Button></div>:nextPlan.lessonId&&nextPlan.owner?renderNextClassEditor():<p className="mt-2 text-sm">Save this lecture to My teaching workspace above to add a private next class plan. Reading and presenting existing notes remain available.</p>}<p className="mt-2 text-xs text-slate-600">Write the plan once in Plan my teaching. Device drafts are automatic; Save teaching plan confirms the private cloud copy. Use Save to my workspace to back up imported plan images.</p></section>
      {planSlide&&<Button className="mb-3 print:hidden" size="sm" variant="outline" onClick={()=>{setLessonView('slides');setOriginalPage(originalPages.length-1);}}>View final plan slide</Button>}
      {/^(?:Science|Physics|Chemistry|Mathematics|Social Science|Computer Science)$/.test(search.subject||"") && <NotesContentCheck slides={withoutNextClassPlan(slides)} klass={String(search.klass||"")} subject={search.subject||""} chapter={search.chapter||title} />}
      {/* Step 1 — Activity verification (skipped for language chapters) */}
      {!skipVerify && lessonView === "slides" && (
        <ActivityVerification
          matches={result.activity_matches}
          activities={result.activities}
          verified={verified}
          onConfirm={() => setVerified(true)}
          onReject={() => {
            toast.message("Refine your Topic / Chapter / Subtopics and run Generate again.");
            setVerified(false);
          }}
        />
      )}


      {!verified && lessonView === "slides" ? (
        <div className="print:hidden mt-6"><p className="text-xs text-muted-foreground mb-3">
          Confirm the matched NCERT Activity above to unlock the interactive slides and animated storyboard.
        </p><Button variant="outline" size="sm" onClick={() => setLessonView("notes")}>Back to guided notes</Button></div>
      ) : (
        <>
          {exportProgress && <p role="status" className="print:hidden mb-3">{exportProgress}</p>}
          {captureEligible && <details className="print:hidden mb-4 rounded-lg border p-3">
            <summary className="cursor-pointer font-medium">Med Easy book pictures · saved library</summary>
            <p className="text-sm mt-2">Each lesson view has its own downloads below. Book reading can continue separately.</p>
            <p className="text-sm text-muted-foreground">Free book-picture capture · no AI credits required. {bookCaptureMessage || "Preparing chapter and topic captures..."}</p>
            <Button className="mt-2" size="sm" variant="outline" onClick={() => {
              if (bookCaptureBusy) { pauseBookPreparation();if (bookCaptureRun.current) bookCaptureRun.current.stopped = true; setBookCaptureMessage("Pausing after the current page is saved..."); }
              else void captureBookPictures();
            }}>{bookCaptureBusy ? "Pause capture" : "Read / resume book pictures"}</Button>
          </details>}
          {captureEligible && <p className="text-sm text-muted-foreground mb-3 print:hidden" role="status">
            {new Set(slides.flatMap(slide => (slide.reference_visuals || []).filter(figure => figure.url).map(figure => figure.storage_path))).size} original book pages included in this chapter’s notes and PPT.
            {bookCaptureBusy ? " More matching pictures will appear as pages are read." : ""}
          </p>}
          {/* Slides */}
          <section className="mb-10 print:m-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 print:hidden">
              <h2 className="font-semibold text-lg">{lessonView === "notes" ? "Guided Notes · reading & presentation" : "Generate PPT & Notes · Lovable slide style"}</h2>
              <div className="flex flex-wrap gap-2">

                {lessonView === "slides" && <>
                  <Button size="sm" variant="outline" disabled={!!exportMode} onClick={() => downloadPDF("slides")}><Download className="h-4 w-4" />Lovable slides PDF</Button>
                  <Button size="sm" disabled={!!exportMode} onClick={() => downloadPPTX("slides")}><Download className="h-4 w-4" />Lovable PPTX</Button>
                </>}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-3 print:hidden" aria-live="polite">
              {exportProgress && <span>{exportProgress}</span>}
              {(lessonView === "notes" ? [
                ["pdf-notes", "Save guided notes PDF"], ["pdf-guided-slides", "Save guided presentation PDF"], ["pptx-guided-slides", "Save guided PPTX"],
              ] : [["pdf-slides", "Save Lovable slides PDF"], ["pptx-slides", "Save Lovable PPTX"] ]).map(([key, label]) => readyDownloads[key] && downloadCache.current.get(key)?.slides === slides && downloadCache.current.get(key)?.layoutKey===displayLayoutKey &&
                <a key={key} className="text-primary underline" href={readyDownloads[key].url} download={readyDownloads[key].filename}>{label}</a>)}
            </div>

            <SourceIndexReview slides={slides}/>
            <SlideLayoutCheck base={baseOriginalPages} pages={originalPages} groups={layoutGroups} onBusyChange={setLayoutChecking}
              onOrganise={groups=>setLayoutPlan({key:baselineLayoutKey,groups})}
              renderPage={(page,index)=><SlideCanvas slide={page} index={index} total={originalPages.length} editing={false} onChange={()=>{}} klass={search.klass} subject={search.subject} chapter={search.chapter||title} staticView/>}/>
            {lessonView === "notes" && <>
              <div className="flex flex-wrap gap-2 mb-4 print:hidden" aria-label="Guided notes layout">
                <Button size="sm" variant={guidedDisplay === "page" ? "default" : "outline"} onClick={() => setGuidedDisplay("page")}>Read guided notes</Button>
                <Button size="sm" variant={guidedDisplay === "presentation" ? "default" : "outline"} onClick={() => setGuidedDisplay("presentation")}>Guided notes presentation</Button>
                <Button size="sm" variant="outline" disabled={!!exportMode} onClick={() => downloadPDF("notes")}>Guided notes PDF</Button>
                <Button size="sm" variant="outline" disabled={!!exportMode} onClick={() => downloadPDF("guided-slides")}>Guided presentation PDF</Button>
                <Button size="sm" variant="outline" disabled={!!exportMode} onClick={() => downloadPPTX("guided-slides")}>Guided presentation PPTX</Button>
              </div>
              {guidedDisplay === "page" ? <><GuidedLessonNotes teacherGuide sourceBooks={result.source_books} slides={slides} title={title} klass={String(search.klass || "")} subject={search.subject} /><TeacherPyqPanel key={JSON.stringify([search.klass,search.subject,search.chapter,search.topic])} guided klass={String(search.klass)} subject={search.subject} chapter={search.chapter||title} topics={[...new Set(slides.filter(slide=>(!slide.kind||slide.kind==='content')&&!slide.teacher_pdf&&!slide.teacher_blank).map(slide=>slide.title).filter(Boolean))]}/></> :
                <GuidedNotesPresentation renderBookmarkControls={renderTeachingBookmark} renderTopicRecovery={renderTopicRecovery} inline mode="notes" slides={slides} title={title} klass={String(search.klass || "")} subject={search.subject} pageIndex={presentationPage} onPageChange={setPresentationPage} onPresent={presentSelectedView} onClose={closePresentation} downloading={exportMode !== null} onPdf={() => downloadPDF("guided-slides")} />}
            </>}
            <div className={lessonView === "slides" ? "lesson-slides" : "hidden"}>

            <div
              key={`slide-${activeIdx}`}
              className="animate-in fade-in slide-in-from-right-4 duration-500 mx-auto grid w-full place-items-center print:hidden"
                          >
              {editing ? <SlideCanvas
                slide={slides[activeIdx]}
                visualSlot={`topic-slide:${slides.slice(0,activeIdx).filter(item=>item.title.trim().toLowerCase()===slides[activeIdx].title.trim().toLowerCase()).length}`}
                index={activeIdx}
                total={slides.length}
                editing={editing}
                onChange={(patch) => updateSlide(activeIdx, patch)}
                imageUrl={images[activeIdx]}
                imageLoading={!!imgLoading[activeIdx]}
                onRegenImage={() => { setImages((m) => { const n = { ...m }; delete n[activeIdx]; return n; }); ensureImage(activeIdx, { force: true }); }}
                klass={search.klass} subject={search.subject} chapter={search.chapter || title}
              /> : <GuidedNotesPresentation renderBookmarkControls={renderTeachingBookmark} renderTopicRecovery={renderTopicRecovery} inline mode="slides" presentationSlides={originalPresentationSlides} slides={slides} title={title} klass={String(search.klass || "")} subject={search.subject} pageIndex={originalPage} onPageChange={setOriginalPage} onPresent={presentSelectedView} onClose={closePresentation} downloading={exportMode !== null} onPdf={() => downloadPDF("slides")} />}
            </div>

            {((lessonView==="notes"&&guidedDisplay==="page")||editing)&&slides.filter(slide=>slide.topic_recovery).map(slide=><MissingTopicNotes onAddBlankSlide={()=>addRecoverySlide(slide.title)} key={slide.title} slide={slide} klass={String(search.klass)} subject={search.subject} chapter={search.chapter||title} onSaved={updated=>setSlides(current=>current.map(item=>item.title===slide.title&&item.topic_recovery?{...item,sections:updated.sections,topic_recovery:updated.topic_recovery,notes_quality:updated.notes_quality,caption:updated.caption}:item))}/>)}
            <details className="lesson-presentation-checks mt-4 rounded-xl border border-border/60 bg-card/60 print:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium">
                <span>Lesson checks <span className="ml-2 text-xs font-normal text-muted-foreground">Sources, visuals and figure references</span></span>
                {(failedCount > 0 || (result.figures_report && !result.figures_report.pass)) && <span className="text-xs text-amber-700">Review needed</span>}
              </summary>
              <div className="px-4 pb-4">
            {/* Live auto-gen status — proves the 2D pipeline is running for
                every subject and every slide, not just Physics. */}
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs print:hidden">
              <Badge variant="outline" className={`rounded-full ${generatedCount === sourceVisualCount ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-primary/10 text-primary border-primary/30"}`}>
                2D infographics: {generatedCount}/{sourceVisualCount} ready
                {inFlightCount > 0 ? ` · ${inFlightCount} drawing…` : ""}
              </Badge>
              <Badge variant="outline" className="rounded-full bg-sky-500/10 text-sky-700 border-sky-500/30">Cached: {cachedCount}</Badge>
              <Badge variant="outline" className="rounded-full bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Fresh (auto-drawn): {freshCount}</Badge>
              {failedCount > 0 && (
                <Badge variant="outline" className="rounded-full bg-rose-500/10 text-rose-700 border-rose-500/30">Failed: {failedCount}</Badge>
              )}
              {dupFixedCount > 0 && (
                <Badge variant="outline" className="rounded-full bg-amber-500/10 text-amber-700 border-amber-500/30">Duplicates redrawn: {dupFixedCount}</Badge>
              )}

              <span className="text-muted-foreground">
                Subject: {result.source_books[0]?.subject || search.subject || "—"} · Class {search.klass || "—"}
              </span>
              {failedCount > 0 && (
                <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={retryAllFailed}>
                  Retry {failedCount} failed
                </Button>
              )}
            </div>

            {/* Real-time per-slide verification panel — shows for each slide
                whether rendering succeeded, failed, and whether it came from the
                slide_image_cache. */}
            <details className="mb-3 rounded-lg border border-border/60 bg-card/50 print:hidden">
              <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold flex items-center gap-2">
                <span>2D infographic verification panel</span>
                <span className="text-muted-foreground font-normal">
                  ({cachedCount} cached · {freshCount} fresh · {failedCount} failed · {inFlightCount} in flight)
                </span>
              </summary>
              <div className="max-h-56 overflow-auto px-3 pb-3">
                <table className="w-full text-[11px] font-mono">
                  <thead className="text-muted-foreground">
                    <tr className="text-left">
                      <th className="py-1 pr-2 w-8">#</th>
                      <th className="py-1 pr-2">Slide</th>
                      <th className="py-1 pr-2 w-24">Status</th>
                      <th className="py-1 pr-2 w-20">Source</th>
                      <th className="py-1 pr-2">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slides.map((sl, i) => {
                      if(sl.teacher_next_class)return null;
                      const st = imgStatus[i]?.state ?? (imgLoading[i] ? "loading" : "pending");
                      const err = imgStatus[i]?.error;
                      const cls =
                        st === "cached" ? "text-sky-700"
                        : st === "fresh" ? "text-emerald-700"
                        : st === "failed" ? "text-rose-700"
                        : st === "loading" ? "text-primary"
                        : "text-muted-foreground";
                      const label =
                        st === "cached" ? "✓ cached"
                        : st === "fresh" ? "✓ generated"
                        : st === "failed" ? "✗ failed"
                        : st === "loading" ? "… drawing"
                        : "· pending";
                      const source =
                        st === "cached" ? "slide_image_cache"
                        : st === "fresh" ? "Auto-render"
                        : st === "failed" ? "—"
                        : "";
                      return (
                        <tr key={i} className="border-t border-border/40">
                          <td className="py-1 pr-2 text-muted-foreground">{i + 1}</td>
                          <td className="py-1 pr-2 truncate max-w-[240px]" title={sl.title}>{sl.title}</td>
                          <td className={`py-1 pr-2 font-semibold ${cls}`}>{label}</td>
                          <td className="py-1 pr-2 text-muted-foreground">{source}</td>
                          <td className="py-1 pr-2">
                            {err ? (
                              <span className="text-rose-700 truncate inline-block max-w-[260px]" title={err}>{err}</span>
                            ) : imgStatus[i]?.regenerated ? (
                              <span className="text-amber-700">duplicate layout detected → redrawn</span>
                            ) : st === "cached" ? (
                              <span className="text-muted-foreground">served from library · unique layout</span>
                            ) : st === "fresh" ? (
                              <span className="text-muted-foreground">new render · unique layout · cached</span>
                            ) : null}

                            {(st === "failed" || st === "cached" || st === "fresh") && (
                              <button
                                type="button"
                                onClick={() => { setImages((m) => { const n = { ...m }; delete n[i]; return n; }); ensureImage(i, { force: true }); }}
                                className="ml-2 text-primary underline hover:no-underline"
                              >
                                regenerate
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>


            {result.figures_report && result.figures_report.context_figures.length > 0 && (
              <div
                className={`mb-3 rounded-lg border px-3 py-2 text-xs print:hidden ${
                  result.figures_report.pass
                    ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-800"
                    : "bg-amber-500/5 border-amber-500/40 text-amber-900"
                }`}
              >
                <div className="font-semibold">
                  Figure placement {result.figures_report.pass ? "✓ verified" : "⚠ needs review"} —
                  {" "}{result.figures_report.context_figures.length} NCERT figure ref
                  {result.figures_report.context_figures.length === 1 ? "" : "s"} found in source.
                </div>
                {!result.figures_report.pass && (
                  <div className="mt-1 space-y-0.5">
                    {result.figures_report.unplaced.length > 0 && (
                      <div>Unplaced (not on any slide): {result.figures_report.unplaced.join(", ")}</div>
                    )}
                    {result.figures_report.failing_slide_indices.length > 0 && (
                      <div>
                        Slides needing a fix:{" "}
                        {result.figures_report.failing_slide_indices.map((i) => i + 1).join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}


              </div>
            </details>

            {editing && <>
            <div className="flex items-center justify-between mt-4 print:hidden">
              <Button variant="outline" size="sm" disabled={activeIdx === 0} onClick={() => setActiveIdx((i) => i - 1)}>
                <ChevronLeft className="h-4 w-4" />Prev
              </Button>
              <div className="text-sm font-mono text-muted-foreground">Slide {activeIdx + 1} / {slides.length}</div>
              <Button variant="outline" size="sm" disabled={activeIdx === slides.length - 1} onClick={() => setActiveIdx((i) => i + 1)}>
                Next<ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 print:hidden">
              {slides.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`shrink-0 w-40 text-left rounded-lg border p-2 text-xs transition ${
                    i === activeIdx ? "border-primary bg-primary/5" : "border-border hover:bg-card/60"
                  }`}
                >
                  <div className="font-semibold truncate">{i + 1}. {s.title}</div>
                  <div className="text-muted-foreground truncate">{s.bullets?.[0]}</div>
                </button>
              ))}
            </div>

            </>}
            <div className="hidden print:block">
              <GuidedLessonNotes teacherGuide sourceBooks={result.source_books} slides={nextClassPdfSlides(slides)} title={title} klass={String(search.klass || "")} subject={search.subject} />
            </div>
            </div>
          </section>

          {lessonView === "slides" && <ExperimentLab activities={result.activities} topic={search.topic || search.chapter || title} klass={search.klass} subject={search.subject} chapter={search.chapter || title} />}
        </>
      )}

      <p className="text-xs text-muted-foreground mt-10 print:hidden">
        Source: {result.source_books.map((b) => `${b.subject} · Class ${b.class} · ${b.chapter}`).join(", ")} ({result.source_basis === "official-online-supplement" ? "Official-source supplementary notes for the selected class, chapter and topics" : result.source_basis === "uploaded-teacher-pdfs" ? "Original uploaded teacher chapter PDFs; NCERT text unavailable" : `${result.context_chars.toLocaleString()} chars of NCERT text`})
      </p>

      {exportMode && <div ref={exportRef} className={`lesson-export-root lesson-export-${exportMode === "notes" ? "notes" : "slides"} ${exportMode === "slides" ? "original-slide-deck" : ""}`} data-presentation-style={exportMode === "slides" ? "lovable" : "guided"} aria-hidden="true">
        {exportMode === "slides" ? originalPages.filter(slide=>exportPurpose!=='pdf'||!slide.teacher_next_class||slide.teacher_next_class.includeInPdf).map((slide, index,items) => <div className="lesson-export-slide original-slide-display" key={index}><SlideCanvas slide={slide} index={index} total={items.length} editing={false} onChange={() => {}} klass={search.klass} subject={search.subject} chapter={search.chapter || title} onNotesOverflow={continueOverflowingNotes} staticView /></div>) :
          <GuidedLessonNotes textOnly={exportPurpose === "pdf" || exportMode === "notes"} teacherGuide={exportMode === "notes"} sourceBooks={result.source_books} slides={exportPurpose==='pdf'?nextClassPdfSlides(slides):slides} title={title} klass={String(search.klass || "")} subject={search.subject} includeCover={exportMode === "guided-slides"} />}
      </div>}
      {presenting && <GuidedNotesPresentation renderBookmarkControls={renderTeachingBookmark} renderTopicRecovery={renderTopicRecovery} slides={slides} title={title} klass={String(search.klass || "")} subject={search.subject} mode={lessonView} presentationSlides={lessonView === "slides" ? originalPresentationSlides : undefined} pageIndex={lessonView === "slides" ? originalPage : presentationPage} onPageChange={lessonView === "slides" ? setOriginalPage : setPresentationPage} onClose={closePresentation} downloading={exportMode !== null} onPdf={() => downloadPDF(lessonView === "notes" ? "guided-slides" : "slides")} />}

    </>
  );
}

function ActivityVerification({
  matches, activities, verified, onConfirm, onReject,
}: {
  matches: GenerationResult["activity_matches"];
  activities: GenerationResult["activities"];
  verified: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const top = matches?.[0];
  const topConfidence = top?.confidence ?? 0;
  const confidenceTone =
    topConfidence >= 70 ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
    : topConfidence >= 40 ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
    : "bg-rose-500/10 text-rose-700 border-rose-500/30";

  return (
    <section className="mb-8 print:hidden">
      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-0">
          <details className="activity-source-review" open={!verified}>
          <summary className="cursor-pointer list-none p-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-base">{verified ? "NCERT source verified" : "Verify your NCERT activity"}</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {verified ? "Source passages and activity details · click to review" : "Confirm the source activity to unlock your presentation."}
              </p>
            </div>
            {verified ? (
              <Badge className="rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                ✓ Verified — lesson unlocked
              </Badge>
            ) : (
              <Badge variant="outline" className={`rounded-full border ${confidenceTone}`}>
                Top confidence: {topConfidence}%
              </Badge>
            )}
          </div>
          </summary>
          <div className="px-4 pb-5 sm:px-6">
          {matches?.length ? (
            <ol className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {matches.map((m, i) => (
                <li key={`${m.book_id}:${m.chunk_index}`} className="rounded-lg border border-border/60 p-3 bg-card/40">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary" className="rounded-full">#{i + 1}</Badge>
                    {m.activity_id && <Badge className="rounded-full bg-primary/10 text-primary border-primary/30">{m.activity_id}</Badge>}
                    <span className="text-muted-foreground truncate">{m.file_name || m.chapter}</span>
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground">chunk #{m.chunk_index} · confidence {m.confidence}%</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">
                    {m.excerpt || "(no readable excerpt)"}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No explicit Activity passage detected — the proposed working guide below was synthesised from the matched chapter text.
            </p>
          )}

          {activities?.[0] && (
            <div className="mt-4 rounded-lg bg-secondary/40 p-3 text-sm">
              <div className="font-medium">Proposed working: {activities[0].name}</div>
              <div className="text-muted-foreground">{activities[0].objective}</div>
            </div>
          )}

          {!verified && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" onClick={onConfirm}>
                <Sparkles className="h-4 w-4" />Confirm — generate PPT & video
              </Button>
              <Button size="sm" variant="outline" onClick={onReject}>
                Not the right activity
              </Button>
            </div>
          )}
          </div>
          </details>
        </CardContent>
      </Card>
    </section>
  );
}

function DiagramFrame({ src, alt, mode }: { src: string; alt: string; mode: "preview" | "presentation" }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [layoutOk, setLayoutOk] = useState(true);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const check = () => {
      const box = frame.getBoundingClientRect();
      const img = frame.querySelector("img");
      if (!img || box.width === 0 || box.height === 0) return setLayoutOk(true);
      const ratioOk = Math.abs(box.width / box.height - 1414 / 1000) < 0.025;
      const padX = box.width * 0.025;
      const padY = box.height * 0.025;
      const imgBox = img.getBoundingClientRect();
      const insideSafePad = imgBox.left >= box.left + padX - 1 && imgBox.right <= box.right - padX + 1 && imgBox.top >= box.top + padY - 1 && imgBox.bottom <= box.bottom - padY + 1;
      setLayoutOk(ratioOk && insideSafePad);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [src]);

  return (
    <div
      ref={ref}
      data-diagram-frame={mode}
      data-layout-check={layoutOk ? "pass" : "adjusted"}
      className="relative w-full max-h-full aspect-[1414/1000] rounded-md overflow-hidden bg-card shadow-soft border border-border/50 p-[2.5%]"
    >
      <img src={src} alt={alt} className="w-full h-full object-contain" onLoad={() => requestAnimationFrame(() => window.dispatchEvent(new Event("resize")))} />
      {!layoutOk && <span className="absolute bottom-1 right-1 text-[9px] text-amber-700 bg-card/90 rounded px-1">safe-frame adjusted</span>}
    </div>
  );
}

function McqSlideBody({ slide, staticView = false }: { slide: Slide; staticView?: boolean }) {
  const [reveal, setReveal] = useState(staticView);
  useEffect(() => { setReveal(staticView); }, [slide, staticView]);
  const mcq = slide.mcq;
  if (!mcq) return null;
  return (
    <div className="p-6 flex flex-col gap-3 min-h-0 overflow-hidden">
      <p className="font-display text-3xl sm:text-4xl font-semibold leading-snug"><MathText text={mcq.question} /></p>
      <ol className="grid sm:grid-cols-2 gap-2">
        {mcq.options.map((o) => {
          const isCorrect = reveal && o.key === mcq.answer;
          return (
            <li key={o.key}
              className={`rounded-md border p-4 text-xl sm:text-2xl leading-relaxed flex gap-3 ${isCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-border/60 bg-card"}`}
            >
              <span className="font-mono font-bold">{o.key}.</span>
              <span><MathText text={o.text} /></span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-2 mt-1">
        {!staticView && <Button size="sm" variant={reveal ? "outline" : "default"} onClick={() => setReveal((v) => !v)}>
          {reveal ? "Hide answer" : "Show answer"}
        </Button>}
        {reveal && (
          <Badge className="rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 text-base px-3 py-1">
            Correct: {mcq.answer}
          </Badge>
        )}
      </div>
      {reveal && mcq.explanation && (
        <p className="text-xl sm:text-2xl leading-relaxed text-foreground border-l-2 border-primary/40 pl-4"><MathText text={mcq.explanation} /></p>
      )}
    </div>
  );
}

function ChapterSlideBody({ slide }: { slide: Slide }) {
  return (
    <div className="p-6 flex flex-col gap-2 min-h-0 overflow-hidden">
      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{slide.chapter_text}</p>
      {slide.figures?.length ? (
        <p className="text-[11px] text-muted-foreground italic">Referenced NCERT figures: {slide.figures.join(", ")}</p>
      ) : null}
    </div>
  );
}

function BreakSlideBody({ slide, subject, klass }: { slide: Slide; subject?: string; klass?: string }) {
  if (slide.visual === "cover") return <LessonCover title={slide.title} objectives={slide.bullets || []} subject={subject} klass={klass} />;

  return (
    <div className="p-8 grid place-items-center text-center gap-3">
      <div className="text-4xl">☕</div>
      <h3 className="font-display text-2xl font-bold">Break Time</h3>
      <p className="text-sm text-muted-foreground max-w-md">{slide.caption}</p>
      <ul className="text-sm space-y-1">
        {(slide.bullets || []).map((b, i) => <li key={i}>• {b}</li>)}
      </ul>
    </div>
  );
}

function SlideCanvas({
  slide, index, total, editing, onChange, imageUrl, imageLoading, onRegenImage, klass, subject, chapter, staticView, onNotesOverflow, visualSlot,
}: {
  slide: Slide; index: number; total: number; editing: boolean; onChange: (p: Partial<Slide>) => void;
  imageUrl?: string; imageLoading?: boolean; onRegenImage?: () => void; klass?: string; subject?: string; chapter?: string; staticView?: boolean;
  visualSlot?: string;
  onNotesOverflow?: (sourceIndex: number, ratio: number, lines: string[]) => void;
}) {
  if (!slide) return null;
  if(slide.teacher_next_class)return <NextClassPlanCanvas slide={slide} index={index} total={total} klass={klass} subject={subject}/>;
  const sourceIndex = (slide as Slide & { sourceIndex?: number }).sourceIndex ?? index;
  imageUrl = renderLessonIllustrationDataUrl({ ...slide, keyTerms: slide.key_terms, chapter, subject, slideIndex: sourceIndex });
  const illustrationCaption=lessonIllustrationCaption(slide.title,subject,{...slide,keyTerms:slide.key_terms,chapter});
  const kind = slide.kind === "chapter" && slide.sections?.length ? "content" : slide.kind || "content";
  const lang = isLanguageSubject(subject) || slide.visual === "formula-reference" || slide.visual === PHYSICAL_REVISION;
  const bookFigurePage = slide.sections?.some(section => section.heading === "Book structure and explanation") && slide.reference_visuals?.some(figure => figure.url);
  if(slide.teacher_pdf){
    const source=slide.reference_visuals?.find(figure=>figure.url);
    return <Card data-teacher-page="true" className="lesson-slide-canvas h-[calc(100dvh-7rem)] min-h-[560px] w-full overflow-hidden border-border/60 shadow-soft">
      <CardContent className="h-full p-4 flex flex-col gap-2 bg-white">
        <h3 className="text-xl font-semibold shrink-0">{slide.title}</h3>
        {source?<img src={source.url} alt={`${slide.teacher_pdf.file_name} · original PDF page ${slide.teacher_pdf.page}`} className="flex-1 min-h-0 w-full object-contain"/>:<p role="alert">The original chapter PDF page has not loaded. Reload the lesson to view and export it.</p>}
        <p className="text-xs text-muted-foreground shrink-0">{slide.caption}</p>
      </CardContent>
    </Card>;
  }
  const v = slide.verification;
  const vTone = !v ? "" :
    v.coverage >= 80 ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" :
    v.coverage >= 55 ? "bg-amber-500/10 text-amber-700 border-amber-500/30" :
    "bg-rose-500/10 text-rose-700 border-rose-500/30";

  // Break / MCQ / chapter slides use single-column layout.
  if (kind === "break" || kind === "mcq" || kind === "chapter") {
    return (
      <Card className="lesson-slide-canvas h-[calc(100dvh-7rem)] min-h-[560px] w-full overflow-hidden border-border/60 shadow-soft print:h-auto print:w-full">
        <CardContent className="h-full p-0 print:h-auto">
          <div className="relative grid h-full w-full grid-rows-[auto_1fr_auto] overflow-hidden bg-card print:h-auto">
            <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-border/60 bg-secondary/40 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-mono">Slide {index + 1} / {total}</span>
              <Badge variant="outline" className={`rounded-full text-[10px] ${kind === "mcq" ? "bg-primary/10 text-primary border-primary/30" : kind === "break" ? "bg-amber-500/10 text-amber-700 border-amber-500/30" : "bg-sky-500/10 text-sky-700 border-sky-500/30"}`}>
                {kind === "mcq" ? "MCQ" : kind === "break" ? (slide.visual === "cover" ? "Chapter overview" : "Break") : "Chapter page"}
              </Badge>
            </div>
            <div className="min-h-0 overflow-hidden">
              {slide.visual !== "cover" && <h3 className="px-6 pt-3 font-display text-lg sm:text-xl font-bold tracking-tight leading-tight line-clamp-2">{slide.title}</h3>}
              {kind === "mcq" && <McqSlideBody slide={slide} staticView={staticView} />}
              {kind === "chapter" && <ChapterSlideBody slide={slide} />}
              {kind === "break" && <BreakSlideBody slide={slide} subject={subject} klass={klass} />}
            </div>
            <div className="px-4 sm:px-6 py-2 border-t border-border/60 bg-secondary/40 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="truncate max-w-[70%] italic">{slide.caption || slide.title}</span>
              <span className="font-mono shrink-0">EduPlan AI · A4</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lesson-slide-canvas h-[calc(100dvh-7rem)] min-h-[560px] w-full overflow-hidden border-border/60 shadow-soft print:h-auto print:w-full">
      <CardContent className="h-full p-0 print:h-auto">
        <div className="relative grid h-full w-full grid-rows-[auto_1fr_auto] overflow-hidden bg-card print:h-auto">
          <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-border/60 bg-secondary/40 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="font-mono">Slide {index + 1} / {total}</span>
            {!staticView && (
            <div className="flex items-center gap-2">
              {v && (
                <Badge variant="outline" className={`rounded-full text-[10px] ${vTone}`}>
                  Text coverage {v.coverage}% · Visual overlap {v.diagram_match}% · Labels {v.diagram_label_fit}
                </Badge>
              )}
              {v?.figures_check && (v.figures_check.expected.length > 0 || v.figures_check.placed.length > 0) && (
                <Badge
                  variant="outline"
                  className={`rounded-full text-[10px] ${v.figures_check.pass ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-rose-500/10 text-rose-700 border-rose-500/30"}`}
                  title={
                    v.figures_check.pass
                      ? `Figures OK: ${v.figures_check.correct.join(", ") || "none"}`
                      : `Swapped: ${v.figures_check.swapped.join(", ") || "—"} · Missing: ${v.figures_check.missing.join(", ") || "—"}`
                  }
                >
                  Figures {v.figures_check.pass ? "✓" : "⚠"} {v.figures_check.correct.length}/{v.figures_check.expected.length}
                </Badge>
              )}
              {(v as any)?.notes_check && (
                <Badge
                  variant="outline"
                  className={`rounded-full text-[10px] ${(v as any).notes_check.pass ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-rose-500/10 text-rose-700 border-rose-500/30"}`}
                  title={
                    (v as any).notes_check.issues.length
                      ? (v as any).notes_check.issues.join(" ")
                      : "Notation renders correctly and vocabulary matches the retrieved source. These checks do not certify factual accuracy."
                  }
                >
                  Notation {(v as any).notes_check.pass ? "✓" : "⚠"} · Source vocabulary overlap {(v as any).notes_check.grounding_confidence}%{(v as any).notes_check.latex_fixed ? ` · ${(v as any).notes_check.latex_fixed} auto-fixed` : ""}
                </Badge>
              )}
              <Badge variant="outline" className="rounded-full text-[10px]">
                {slide.notes_quality && !slide.notes_quality.ready ? "Source review needed" : "Textbook-based"}
              </Badge>

            </div>
            )}
          </div>

          <div className="lesson-slide-body grid grid-cols-1 md:grid-cols-[3fr_2fr] min-h-0 overflow-hidden" style={lang ? { gridTemplateColumns: "1fr" } : undefined}>
            {bookFigurePage ? <BookMapSlide title={slide.title} figures={slide.reference_visuals} subject={subject} /> : <>
            <div className="px-5 sm:px-8 py-5 flex flex-col gap-3 min-h-0 overflow-hidden">
              {editing ? (
                <Input
                  value={slide.title}
                  onChange={(e) => onChange({ title: e.target.value })}
                  className="font-display text-[clamp(22px,2.2vw,32px)] font-bold border-0 px-0 shadow-none focus-visible:ring-0 h-auto"
                />
              ) : (
                <h3 className="font-display text-[clamp(22px,2.2vw,32px)] font-bold tracking-tight leading-tight shrink-0">{slide.title}</h3>
              )}
              {!(slide as any).sections?.length || editing ? (
                <ul className="space-y-1">
                  {(slide.bullets || []).map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
                      {editing ? (
                        <Textarea
                          value={b}
                          onChange={(e) => {
                            const next = [...slide.bullets];
                            next[i] = e.target.value;
                            onChange({ bullets: next });
                          }}
                          className="min-h-[32px] resize-none text-xs"
                        />
                      ) : (
                        <p className="text-[12px] leading-snug"><MathText text={b} /></p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
              <PagedNoteSections
                organizeSpace
                sections={slide.sections?.filter((section) => section.kind !== "diagram")}
                onOverflow={onNotesOverflow ? (ratio, lines) => onNotesOverflow(sourceIndex, ratio, lines) : undefined}
                subject={subject}
                header={<PenNotesBlock index={sourceIndex} slide={slide} subject={subject} editable={!staticView} />}
              />


              {slide.notes?.length && !(slide as any).sections?.length ? (
                <div className="rounded-md bg-secondary/50 border border-border/50 p-2 overflow-hidden">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-primary mb-1">NCERT notes</div>
                  <ol className="space-y-0.5 list-decimal list-inside text-[11px] leading-snug text-foreground/85">
                    {slide.notes.map((n, i) => <li key={i}><MathText text={n} /></li>)}
                  </ol>
                </div>
              ) : null}
              {slide.key_terms?.length && !(slide as any).sections?.length ? (
                <div className="rounded-md bg-accent/20 border border-border/50 p-2 overflow-hidden">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-primary mb-1">Key terms</div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] leading-snug">
                    {slide.key_terms.map((t, i) => (
                      <div key={i}><dt className="font-semibold inline">{t.term}: </dt><dd className="inline text-muted-foreground">{t.meaning}</dd></div>
                    ))}
                  </dl>
                </div>
              ) : null}
              {editing && (
                <Input
                  value={slide.caption ?? ""}
                  placeholder="Caption (optional)"
                  onChange={(e) => onChange({ caption: e.target.value })}
                  className="text-[11px] h-8"
                />
              )}
              {slide.figures?.length && !(slide as any).sections?.length ? (
                <p className="text-[10px] text-muted-foreground">📖 Refer NCERT {slide.figures.join(", ")}</p>
              ) : null}
              {slide.ncert_quote && !(slide as any).sections?.length ? (
                <p className="text-[10px] italic text-muted-foreground border-l-2 border-primary/40 pl-2 line-clamp-2">“{slide.ncert_quote}”</p>
              ) : null}

            </div>
            <div className="relative bg-gradient-to-br from-primary/10 via-secondary to-accent/30 flex flex-col p-3 border-l border-border/60 overflow-hidden gap-2 min-h-0" style={lang ? { display: "none" } : undefined}>
              <div className="absolute top-2 left-2 z-10 text-[9px] font-mono text-muted-foreground bg-card/80 rounded px-1.5 py-0.5 border border-border/40">2D infographic · auto</div>
              <div className="lesson-figure-panel relative w-full flex-[3] rounded-md overflow-hidden bg-card shadow-soft border border-border/50 min-h-0 flex flex-col">
                {isMathematics(subject) || imageUrl ? (
                  <ManualVisualEditor autoSaveDevice={!!slide.teacher_blank} displaySlideNumber={index+1} previousSharedSlideId={visualSlot||(slide as Slide & {visualSlot?:string}).visualSlot} sharedSlideId={slide.teacher_blank?`teacher-blank:${slide.teacher_blank.id}`:exactSlideVisualId(slide,visualSlot||(slide as Slide & {visualSlot?:string}).visualSlot)} slideId={String(sourceIndex)} klass={klass} subject={subject} chapter={chapter} topic={slide.title} storageKey={JSON.stringify(slide.teacher_blank?[klass,subject,chapter,slide.teacher_blank.id]:[klass,subject,chapter,slide.title,sourceIndex,slide.sections?.flatMap(section=>section.lines).slice(0,2)||slide.notes.slice(0,2)])} autoUrl={imageUrl||''} autoContent={isMathematics(subject)?<MathematicsTopicVisual input={{ ...slide, keyTerms: slide.key_terms }} />:undefined} alt={`${slide.title} — NCERT 2D infographic`} />
                ) : imageLoading ? (
                  <div className="flex flex-col items-center gap-2 text-[10px] text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    Drawing 2D infographic from NCERT notes…
                  </div>
                ) : (
                  <button onClick={onRegenImage} className="flex flex-col items-center gap-1 text-[10px] text-primary underline hover:no-underline">
                    <span>Retry 2D infographic</span>
                    <span className="text-muted-foreground no-underline">(free auto-render · cached)</span>
                  </button>
                )}
              </div>

              {!slide.reference_visuals?.some(figure => figure.url) && <div className="lesson-diagram-description order-last mt-auto px-3 py-2 rounded-md bg-card border border-border/50 text-[11px] leading-snug shrink-0">
                <p className="font-medium text-primary notebook-guide-heading">{illustrationCaption.startsWith('No suitable')?'Add a diagram':'Read the diagram'}</p>
                <p>{illustrationCaption}</p>
                {(slide.key_terms || []).filter(term=>typeof term==='object' && term.term.length<=35 && !/^(if|thus|chapter|constant [a-z]$)/i.test(term.term)).slice(0, 3).map((term, index) => <span key={index} className="inline-block mt-1 mr-2"><mark className="notebook-term-highlight">{term.term}</mark></span>)}
              </div>}
              {!!slide.reference_visuals?.some(figure => figure.url) && <div className="lesson-book-supplement w-full flex-[4] min-h-0 flex overflow-hidden border-t border-border" aria-label="Original book screenshots below the 2D illustration">
                <BookReferenceFigures figures={slide.reference_visuals} compact presentation subject={subject} />
              </div>}
              {slide.context_illustration && <figure className="flex-1 min-h-0 bg-white rounded-lg overflow-hidden flex flex-col">
                <img className="w-full min-h-0 flex-1 object-contain" src={slide.context_illustration.url} alt={slide.context_illustration.description} />
                <figcaption className="text-[10px] text-center px-2 pb-1">AI context illustration · {slide.context_illustration.provider}</figcaption>
              </figure>}
              {/* Hide the 3D / simulation panel entirely for language subjects. */}
              {!lang && !staticView && (
                <div className="lesson-simulation-panel relative w-full flex-[2] rounded-md overflow-hidden bg-card shadow-soft border border-border/50 min-h-0">
                  <SimPanel slide={slide} index={sourceIndex} subject={subject} editable />
                </div>
              )}
            </div>
            </>}
          </div>

          <div className="px-4 sm:px-6 py-2 border-t border-border/60 bg-secondary/40 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="truncate max-w-[70%] italic">{slide.source_recovery?.url?<a href={slide.source_recovery.url} target="_blank" rel="noreferrer" className="underline">{slide.source_recovery.kind==='official-online-supplement'?'Supplementary notes · source':'External NCERT mirror · IIT Kanpur SATHEE · source'}</a>:slide.caption || `NCERT-grounded summary — ${slide.title}`}</span>
            <span className="font-mono shrink-0">EduPlan AI · A4</span>
          </div>
        </div>

        {v && v.missing.length > 0 && (
          <div className="px-4 py-2 border-t border-border/60 text-[11px] text-muted-foreground print:hidden">
            <span className="font-semibold text-rose-700">Flagged as not directly matched in NCERT text:</span>{" "}
            {v.missing.map((m, i) => <span key={i} className="italic">“{m}”{i < v.missing.length - 1 ? "; " : ""}</span>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Resolves auto-picked simulations for a slide, layers any per-slide
 * teacher overrides on top (persisted via useSimOverride), and — when
 * `editable` — exposes the reorder/add/remove popover.
 */
function SimPanel({ slide, index, subject, editable }: { slide: Slide; index: number; subject?: string; editable?: boolean }) {
  const auto = useMemo(
    () => pickSimulations(
      [slide.title, ...(slide.bullets || []), ...(slide.notes || [])].join(" "),
      subject,
      3,
    ),
    [slide, subject],
  );
  const key = slideKey(subject, index, slide.title || "");
  const { sims, isOverridden, save, reset } = useSimOverride(key, auto);
  return (
    <div className="relative w-full h-full">
      {editable && (
        <SimulationOverrideEditor
          sims={sims}
          onChange={save}
          onReset={reset}
          isOverridden={isOverridden}
        />
      )}
      <SimulationViewer sims={sims} />
    </div>
  );
}
