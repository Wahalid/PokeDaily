import { useMemo } from "react";
import { CRY_ROUNDS, type CryPublicState } from "@/lib/cry/types";
import { readLocal, useLocalStorage, writeLocal } from "@/lib/storage/local-store";
import { computeStreak, recordCompletion } from "@/lib/storage/streaks";

/** What is saved per day: the submitted choices, the last server state and how far the player has moved on. */
export interface StoredCry {
  /** Opaque daily key; progress for a different key (re-frozen day) is ignored. */
  key?: string;
  choices: number[];
  state?: CryPublicState;
  /** Rounds whose feedback the player has dismissed with NEXT. */
  seen: number;
}

/** One localStorage entry per challenge number, so a new day starts a new game automatically. */
export const cryStorageKey = (challengeNumber: number) => `pokedaily:cry:${challengeNumber}`;

/** Pure: saved progress if it belongs to this day and is consistent, otherwise a fresh game. */
export function restoreCry(raw: StoredCry | null | undefined, progressKey: string, initial: CryPublicState): StoredCry & { state: CryPublicState } {
  const valid =
    !!raw &&
    raw.key === progressKey &&
    Array.isArray(raw.choices) &&
    raw.choices.length <= CRY_ROUNDS &&
    Array.isArray(raw.state?.results) &&
    raw.state!.results.length === raw.choices.length &&
    Number.isInteger(raw.seen) &&
    raw.seen <= raw.choices.length;
  return valid ? { ...raw!, state: raw!.state! } : { choices: [], seen: 0, state: initial };
}

const EMPTY: StoredCry | null = null;

export function useCryProgress(challengeNumber: number, progressKey: string, initial: CryPublicState) {
  const storageKey = cryStorageKey(challengeNumber);
  const [stored] = useLocalStorage<StoredCry | null>(storageKey, EMPTY);
  const progress = restoreCry(stored, progressKey, initial);
  const save = (next: Omit<StoredCry, "key">) => writeLocal<StoredCry>(storageKey, { ...next, key: progressKey });
  return { progress, save };
}

// ---- Statistics (PokéCry only, this device) -------------------------------------

type Results = Record<string, { score: number }>;
const RESULTS_KEY = "pokedaily:results:cry";
const NO_RESULTS: Results = {};

/** A day counts for the shared streak once its 5 rounds are played. */
export function recordCryResult(challengeNumber: number, score: number): void {
  const results = readLocal<Results>(RESULTS_KEY, NO_RESULTS);
  if (results[String(challengeNumber)]) return;
  writeLocal<Results>(RESULTS_KEY, { ...results, [String(challengeNumber)]: { score } });
  recordCompletion("cry", challengeNumber);
}

export interface CryStats {
  played: number;
  perfect: number;
  avgScore: number;
  currentStreak: number;
  bestStreak: number;
}

/** Pure computation, exported for tests. */
export function computeCryStats(results: Results, currentNumber: number): CryStats {
  const entries = Object.entries(results);
  const numbers = entries.map(([n]) => Number(n)).sort((a, b) => a - b);
  let best = 0, run = 0, prev = -1;
  for (const n of numbers) {
    run = n === prev + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = n;
  }
  const total = entries.reduce((s, [, r]) => s + r.score, 0);
  return {
    played: entries.length,
    perfect: entries.filter(([, r]) => r.score === CRY_ROUNDS).length,
    avgScore: entries.length ? Math.round((total / entries.length) * 10) / 10 : 0,
    currentStreak: computeStreak(numbers, currentNumber),
    bestStreak: best,
  };
}

export function useCryStats(currentNumber: number): CryStats {
  const [results] = useLocalStorage<Results>(RESULTS_KEY, NO_RESULTS);
  return useMemo(() => computeCryStats(results, currentNumber), [results, currentNumber]);
}
