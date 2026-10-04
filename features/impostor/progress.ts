import { useMemo } from "react";
import type { ImpostorMode, ImpostorPublicState, Verdict } from "@/lib/impostor/types";
import { readLocal, useLocalStorage, writeLocal } from "@/lib/storage/local-store";
import { computeStreak, recordCompletion } from "@/lib/storage/streaks";

/**
 * What is saved per day: the chosen mode (locked once chosen), whether the help
 * was used, the draft selection (normal) or decisions (one-by-one), and the last
 * server state. The server re-validates everything on each move.
 */
export interface StoredImpostor {
  /** Opaque daily key; progress for a different key (re-frozen day) is ignored. */
  key?: string;
  mode?: ImpostorMode;
  help: boolean;
  selection: number[];
  decisions: Verdict[];
  state?: ImpostorPublicState;
}

const EMPTY: StoredImpostor = { help: false, selection: [], decisions: [] };

/** One localStorage entry per challenge number, so a new day starts a new game automatically. */
export const impostorStorageKey = (challengeNumber: number) => `pokedaily:impostor:${challengeNumber}`;

/** Pure: saved progress if it belongs to this board, otherwise a fresh game. */
export function restoreImpostor(raw: StoredImpostor | null | undefined, progressKey: string): StoredImpostor {
  const valid =
    !!raw &&
    raw.key === progressKey &&
    (raw.mode === "normal" || raw.mode === "one-by-one") &&
    Array.isArray(raw.selection) &&
    Array.isArray(raw.decisions) &&
    (!raw.state || raw.state.mode === raw.mode);
  return valid ? { ...raw!, help: !!raw!.help } : EMPTY;
}

export function useImpostorProgress(challengeNumber: number, progressKey: string) {
  const storageKey = impostorStorageKey(challengeNumber);
  const [stored] = useLocalStorage<StoredImpostor>(storageKey, EMPTY);
  const progress = restoreImpostor(stored, progressKey);
  const save = (next: Omit<StoredImpostor, "key">) => writeLocal<StoredImpostor>(storageKey, { ...next, key: progressKey });
  return { progress, save };
}

// ---- Statistics (PokéImpostor only, this device) -------------------------------

type Results = Record<string, { won: boolean; score: number; mode: ImpostorMode; help: boolean }>;
const RESULTS_KEY = "pokedaily:results:impostor";
const NO_RESULTS: Results = {};

export function recordImpostorResult(challengeNumber: number, result: Results[string]): void {
  const results = readLocal<Results>(RESULTS_KEY, NO_RESULTS);
  if (results[String(challengeNumber)]) return;
  writeLocal<Results>(RESULTS_KEY, { ...results, [String(challengeNumber)]: result });
  if (result.won) recordCompletion("impostor", challengeNumber);
}

export interface ImpostorStats {
  played: number;
  won: number;
  currentStreak: number;
  bestStreak: number;
  /** Wins in one-by-one mode. */
  oneByOneWins: number;
}

/** Pure computation, exported for tests. */
export function computeImpostorStats(results: Results, currentNumber: number): ImpostorStats {
  const entries = Object.entries(results);
  const wins = entries.filter(([, r]) => r.won);
  const winNumbers = wins.map(([n]) => Number(n)).sort((a, b) => a - b);
  let best = 0, run = 0, prev = -1;
  for (const n of winNumbers) {
    run = n === prev + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = n;
  }
  return {
    played: entries.length,
    won: wins.length,
    currentStreak: computeStreak(winNumbers, currentNumber),
    bestStreak: best,
    oneByOneWins: wins.filter(([, r]) => r.mode === "one-by-one").length,
  };
}

export function useImpostorStats(currentNumber: number): ImpostorStats {
  const [results] = useLocalStorage<Results>(RESULTS_KEY, NO_RESULTS);
  return useMemo(() => computeImpostorStats(results, currentNumber), [results, currentNumber]);
}
