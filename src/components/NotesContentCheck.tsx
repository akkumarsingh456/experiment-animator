import { useEffect, useMemo, useState } from "react";
import type { Slide } from "@/lib/generate.functions";
import { reviewLessonFacts, type ReviewSource } from "@/lib/notes-factual-review";
import { loadNotesReviewSources } from "@/lib/notes-review-sources.functions";
import { MathText } from "./MathText";

type SourceResult = { sources: ReviewSource[]; partial: boolean };
const sourcesCache = new Map<string, { expires: number; request: Promise<SourceResult> }>();
export function NotesContentCheck({ slides, klass, subject, chapter }: { slides: Slide[]; klass: string; subject: string; chapter: string }) {
  const [enabled, setEnabled] = useState(true), [attempt, setAttempt] = useState(0);
  const [source, setSource] = useState<SourceResult | null>(null), [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const grade = klass.replace(/\D/g, "");
  const key = JSON.stringify([grade, subject, chapter]);
  useEffect(() => {
    let cancelled = false; setSource(null); setError(""); setBusy(false);
    if (!enabled || !["9", "10", "11", "12"].includes(grade) || !chapter) return;
    setBusy(true);
    let hit = sourcesCache.get(key);
    if (!hit || hit.expires < Date.now() || attempt) {
      const entry = { expires: Date.now() + 300000, request: loadNotesReviewSources({ data: { klass: grade as "9" | "10" | "11" | "12", subject, chapter } }) };
      entry.request = entry.request.catch(reason => { if (sourcesCache.get(key) === entry) sourcesCache.delete(key); throw reason; });
      sourcesCache.set(key, entry); hit = entry;
      if (sourcesCache.size > 12) sourcesCache.delete(sourcesCache.keys().next().value!);
    }
    void hit.request.then(result => { if (!cancelled) setSource(result); }).catch(() => { if (!cancelled) setError("The saved textbook source could not be read. Check again when the connection is available."); }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [enabled, key, attempt]);
  const review = useMemo(() => reviewLessonFacts(slides, source?.sources || []), [slides, source]);
  const pending = review.claims.filter(claim => claim.status !== "source-match").sort((a,b) => Number(b.status === "possible-conflict") - Number(a.status === "possible-conflict"));
  return <aside className="print:hidden rounded-lg border p-3 mb-4" aria-label="Notes source and content check">
    <label className="flex gap-2 items-center font-medium"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />Check notes against saved chapter sources · free</label>
    {enabled && <>
      <p className="text-sm mt-2" role="status">{busy ? "Reading the matching textbook chapter for a separate source check…" : error || !source ? error || "Independent chapter evidence is not available yet." : `${review.matched} source wording matches · ${review.conflicts} possible conflicts · ${review.unreviewed} need review`}</p>
      <p className="text-xs text-muted-foreground mt-1">This check does not prove every statement true. Source matches, word overlap and valid formulas are not a guarantee of factual accuracy. Your notes are unchanged.</p>
      {!!source && !source.sources.length && <p className="text-sm mt-1">No readable matching textbook chapter was found. Generated notes are not used as their own evidence.</p>}
      {source?.partial && <p className="text-sm mt-1">Only part of the available source could be checked. Remaining material needs review.</p>}
      {!!review.imageOnly && <p className="text-sm mt-1">{review.imageOnly} original PDF page(s) contain image-only material that this text check cannot verify.</p>}
      <button className="underline text-sm mt-2" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Check again</button>
      {!busy && !!source && !!pending.length && <details className="mt-2" open={review.conflicts > 0}><summary className="cursor-pointer">Review flagged or unmatched statements ({pending.length})</summary>
        <ol className="space-y-3 mt-2">{pending.map((claim, index) => <li className="border-l-2 pl-3" key={index}>
          <strong>Slide {claim.slide} · {claim.topic} · {claim.status === "possible-conflict" ? "Possible conflict" : "Needs source review"}</strong>
          <p><MathText text={claim.text} subject={subject} /></p><p className="text-sm">{claim.reason}</p>
          {claim.evidence && <details><summary>Compare saved source · {claim.evidence.book} · {claim.evidence.location}</summary><p><MathText text={claim.evidence.text} subject={subject} /></p></details>}
        </li>)}</ol>
      </details>}
    </>}
  </aside>;
}
