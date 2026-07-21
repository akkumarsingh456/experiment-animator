// Per-slide simulation overrides. Persisted in localStorage so a teacher's
// custom ordering / added links survive reloads. Presentation mode reads
// the same store so overrides show up there too.
import { useEffect, useState, useCallback } from "react";
import type { Simulation } from "@/config/simulations";

const STORAGE_KEY = "simov:v1";
const EVENT = "simov:changed";

export function slideKey(subject: string | undefined, slideIndex: number, title: string): string {
  const s = (subject || "general").toLowerCase().trim();
  const t = (title || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
  return `${s}::${slideIndex}::${t}`;
}

type Store = Record<string, Simulation[]>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as Store; }
  catch { return {}; }
}

function writeStore(next: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useSimOverride(key: string, fallback: Simulation[]) {
  const [override, setOverride] = useState<Simulation[] | null>(() => {
    const s = readStore();
    return s[key] ?? null;
  });

  useEffect(() => {
    function sync() {
      const s = readStore();
      setOverride(s[key] ?? null);
    }
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [key]);

  const save = useCallback((sims: Simulation[]) => {
    const s = readStore();
    s[key] = sims;
    writeStore(s);
    setOverride(sims);
  }, [key]);

  const reset = useCallback(() => {
    const s = readStore();
    delete s[key];
    writeStore(s);
    setOverride(null);
  }, [key]);

  return {
    sims: override ?? fallback,
    isOverridden: override !== null,
    save,
    reset,
  };
}
