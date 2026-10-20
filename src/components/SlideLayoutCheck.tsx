import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  compactLayoutGroups,
  layoutKey,
  materializeLayout,
  sameLayoutContent,
  slideSpace,
  SPARSE_FILL,
  briefTopicPages,
  type LayoutPage,
  type PageSpace,
} from "@/lib/slide-layout-check";
type Props = {
  base: LayoutPage[];
  pages: LayoutPage[];
  groups: number[][];
  onOrganise: (groups: number[][]) => void;
  onBusyChange?: (busy: boolean) => void;
  renderPage: (page: LayoutPage, index: number) => ReactNode;
};
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
/** Free browser-only checking and a separate post-repair verification pass. */
export function SlideLayoutCheck({
  base,
  pages,
  groups,
  onOrganise,
  onBusyChange,
  renderPage,
}: Props) {
  const [enabled, setEnabled] = useState(true),
    [run, setRun] = useState(0),
    [index, setIndex] = useState(-1);
  const [phase, setPhase] = useState<"checking" | "verifying" | "done" | "off" | "error">(
    "checking",
  );
  const [resultKey, setResultKey] = useState("");
  const [results, setResults] = useState<PageSpace[]>([]),
    [message, setMessage] = useState("");
  const probe = useRef<HTMLDivElement>(null),
    measurements = useRef<PageSpace[]>([]),
    attempts = useRef(0),
    baseKey = layoutKey(base),
    key = layoutKey(pages);
  const lastBase = useRef(baseKey);
  useEffect(() => {
    onBusyChange?.(enabled && (phase === "checking" || phase === "verifying"));
  }, [enabled, phase, onBusyChange]);
  useEffect(() => {
    if (lastBase.current !== baseKey) {
      attempts.current = 0;
      lastBase.current = baseKey;
    }
    measurements.current = [];
    setResultKey(key);
    setResults([]);
    setMessage("");
    if (!enabled) {
      setPhase("off");
      setIndex(-1);
      return;
    }
    if (!pages.length) {
      setPhase("done");
      setIndex(-1);
      return;
    }
    setPhase(attempts.current ? "verifying" : "checking");
    setIndex(0);
  }, [key, baseKey, enabled, run]);
  useEffect(() => {
    if (!enabled || index < 0 || index >= pages.length) return;
    let stopped = false;
    void (async () => {
      await document.fonts?.ready;
      await frame();
      await frame();
      await frame();
      if (stopped || !probe.current) return;
      try {
        const measured = slideSpace(probe.current, pages[index], index);
        measurements.current[index] = measured;
        setResults([...measurements.current]);
        if (index + 1 < pages.length) {
          setIndex(index + 1);
          return;
        }
        if (!sameLayoutContent(base, pages))
          throw new Error(
            "The content-preservation check failed. The original arrangement has been restored.",
          );
        const all = [...measurements.current];
        const overflowing = all
          .map((item, i) => (item.overflow && groups[i].length > 1 ? i : -1))
          .filter((i) => i >= 0);
        if (overflowing.length) {
          attempts.current = 2;
          onOrganise(
            groups.flatMap((group, i) =>
              overflowing.includes(i) ? group.map((value) => [value]) : [group],
            ),
          );
          return;
        }
        if (attempts.current < 2) {
          const proposed = compactLayoutGroups(pages, all);
          if (proposed.length < pages.length) {
            const next = proposed.map((group) => group.flatMap((i) => groups[i]));
            if (!sameLayoutContent(base, materializeLayout(base, next)))
              throw new Error("The proposed layout did not preserve every source entry.");
            attempts.current++;
            setPhase("verifying");
            onOrganise(next);
            return;
          }
        }
        setIndex(-1);
        setPhase("done");
      } catch (error) {
        if (!sameLayoutContent(base, pages)) onOrganise(base.map((_, i) => [i]));
        setMessage(error instanceof Error ? error.message : "The layout check could not finish.");
        setPhase("error");
        setIndex(-1);
      }
    })();
    return () => {
      stopped = true;
    };
  }, [index, key, baseKey, enabled, run]);
  const currentResults = resultKey === key ? results : [];
  const briefTopics=briefTopicPages(pages);
  const sparse = currentResults.filter((item) => !item.exempt && item.fill < SPARSE_FILL).length,
    overflow = currentResults.filter((item) => item.overflow).length;
  return (
    <section
      className="my-4 rounded-xl border border-border bg-card p-4 print:hidden"
      aria-label="Free slide layout check"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Automatically check and organise slide spacing
        </label>
        <span className="text-sm text-emerald-700">Free · runs on your device</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Checks every PPT slide, combines sparse continuation pages from the same topic, then
        verifies the corrected layout. All notes, formulas and original source entries are retained.
      </p>
      <p className="mt-2 text-sm" role="status" aria-live="polite">
        {phase === "off"
          ? "Automatic layout checking is off."
          : phase === "error"
            ? message
            : phase === "done"
              ? `Checked ${currentResults.length}/${pages.length} slides · ${Math.max(0, base.length - pages.length)} continuation pages combined · ${sparse} short pages · ${overflow} overflow issues.`
              : `${phase === "verifying" ? "Verifying corrected layout" : "Checking slide spacing"}: ${currentResults.length}/${pages.length}`}
      </p>
      {phase === "done" && resultKey === key && (
        <p className="mt-1 text-sm text-muted-foreground">
          {briefTopics.length
            ? "Some topics contain very little explanation. Check their chapter sources and regenerate; spacing checks cannot recover missing notes."
            : sparse || overflow
            ? "Some pages need attention. Short pages remain when no safe same-topic merge is possible."
            : "Layout verified. Every source entry is preserved."}
        </p>
      )}
      {phase === "done" && resultKey === key && briefTopics.length>0 && <details className="mt-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm" open>
        <summary className="cursor-pointer font-semibold">Topics with little explanatory content ({briefTopics.length})</summary>
        <ul className="mt-2 list-disc pl-5">{briefTopics.map(item=><li key={item.page}>Slide {item.page}: {item.title} — review source coverage.</li>)}</ul>
        <p className="mt-2">This is a completeness warning, not proof that the notes are false. Existing content is preserved.</p>
      </details>}
      <button
        type="button"
        className="mt-2 rounded border px-3 py-1 text-sm"
        disabled={!enabled || phase === "checking" || phase === "verifying"}
        onClick={() => {
          attempts.current = 0;
          setRun((value) => value + 1);
        }}
      >
        Check again
      </button>
      {phase === "done" && resultKey === key && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer">Per-slide results</summary>
          <ol className="mt-2 max-h-48 overflow-auto list-decimal pl-6">
            {currentResults.map((item, i) => (
              <li key={i}>
                {pages[i].title} —{" "}
                {item.exempt
                  ? "Cover, question or original PDF page"
                  : item.overflow
                    ? "Needs overflow correction"
                    : item.fill < SPARSE_FILL
                      ? `Short page (${Math.round(item.fill * 100)}% filled)`
                      : `Verified (${Math.round(item.fill * 100)}% filled)`}
              </li>
            ))}
          </ol>
        </details>
      )}
      {enabled && index >= 0 && index < pages.length && (
        <div
          aria-hidden="true"
          className="original-slide-display print:hidden"
          ref={probe}
          style={{
            position: "fixed",
            left: "-100000px",
            top: 0,
            width: 1280,
            height: 720,
            visibility: "hidden",
            pointerEvents: "none",
          }}
        >
          {renderPage(pages[index], index)}
        </div>
      )}
    </section>
  );
}
