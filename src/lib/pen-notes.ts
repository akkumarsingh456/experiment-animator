/**
 * Per-slide "pen & paper" notes written by the teacher.
 *
 * Saved in localStorage keyed by the same slide key as simulation overrides, so
 * an edit survives reloads and regenerations — the teacher is never asked for
 * the same formula twice.
 */
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "penotes:v1";
const EVENT = "penotes:changed";

type Store = Record<string, string[]>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as Store;
  } catch {
    return {};
  }
}

function writeStore(next: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function usePenNotes(key: string) {
  const [lines, setLines] = useState<string[]>(() => readStore()[key] ?? []);

  useEffect(() => {
    function sync() {
      setLines(readStore()[key] ?? []);
    }
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [key]);

  const save = useCallback(
    (next: string[]) => {
      const s = readStore();
      const clean = next.map((l) => l.trim()).filter(Boolean);
      if (clean.length) s[key] = clean;
      else delete s[key];
      writeStore(s);
      setLines(clean);
    },
    [key],
  );

  const append = useCallback(
    (extra: string[]) => {
      const s = readStore();
      const seen = new Set((s[key] ?? []).map((l) => l.toLowerCase()));
      const merged = [...(s[key] ?? []), ...extra.filter((l) => !seen.has(l.trim().toLowerCase()))];
      s[key] = merged;
      writeStore(s);
      setLines(merged);
    },
    [key],
  );

  const clear = useCallback(() => save([]), [save]);

  return { lines, save, append, clear };
}

/** Read saved pen notes for a slide outside React (PPTX export). */
export function getPenNotes(key: string): string[] {
  return readStore()[key] ?? [];
}
