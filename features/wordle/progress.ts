import { useMemo } from "react";
import type { WordlePublicState } from "@/lib/wordle/types";
import { MAX_ATTEMPTS } from "@/lib/wordle/types";
import { readLocal, useLocalStorage, writeLocal } from "@/lib/storage/local-store";
import { computeStreak, recordCompletion } from "@/lib/storage/streaks";

/** What is saved per day: the guesses (authoritative input) and the last server state. */
export interface StoredWordle {
  /** Opaque daily key; progress for a different key (re-frozen day) is ignored. */
  key?: string;
  guesses: string[];
  state?: WordlePublicState;
}

const EMPTY: StoredWordle = { guesses: [] };

/** One localStorage entry per challenge number, so a new day starts a new game automatically. */
export const wordleStorageKey = (challengeNumber: number) => `pokedaily:wordle:${challengeNumber}`;

/** Pure: saved progress if it belongs to this puzzle, otherwise a fresh game. */
export function restoreWordle(raw: StoredWordle | null | undefined, progressKey: string, initial: WordlePublicState) {
  const valid =
    !!raw &&
    raw.key === progressKey &&
    Array.isArray(raw.guesses) &&
    Array.isArray(raw.state?.rows) &&
    raw.state!.length === initial.length &&
    raw.state!.rows.length === raw.guesses.length;
  return valid ? { guesses: raw!.guesses, state: raw!.state! } : { guesses: [] as string[], state: initial };
}

export function useWordleProgress(challengeNumber: number, progressKey: string, initial: WordlePublicState) {
  const storageKey = wordleStorageKey(challengeNumber);
  const [stored] = useLocalStorage<StoredWordle>(storageKey, EMPTY);
  const progress = restoreWordle(stored, progressKey, initial);
  const save = (guesses: string[], state: WordlePublicState) =>
    writeLocal<StoredWordle>(storageKey, { key: progressKey, guesses, state });
  return { ...progress, save };
}

// ---- Statistics (PokéWordle only, this device) --------------------------------

type Results = Record<string, { won: boolean; attempts: number }>;
const RESULTS_KEY = "pokedaily:results:wordle";
const NO_RESULTS: Results = {};

export function recordWordleResult(challengeNumber: number, won: boolean, attempts: number): void {
  const results = readLocal<Results>(RESULTS_KEY, NO_RESULTS);
  if (results[String(challengeNumber)]) return;
  writeLocal<Results>(RESULTS_KEY, { ...results, [String(challengeNumber)]: { won, attempts } });
  if (won) recordCompletion("wordle", challengeNumber);
}

export interface WordleStats {
  played: number;
  won: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  /** Wins by number of attempts: index 0 = solved in 1. */
  distribution: number[];
}

/** Pure computation, exported for tests. */
export function computeWordleStats(results: Results, currentNumber: number): WordleStats {
  const entries = Object.entries(results);
  const wins = entries.filter(([, r]) => r.won);
  const winNumbers = wins.map(([n]) => Number(n)).sort((a, b) => a - b);
  let best = 0, run = 0, prev = -1;
  for (const n of winNumbers) {
    run = n === prev + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = n;
  }
  const distribution = Array<number>(MAX_ATTEMPTS).fill(0);
  for (const [, r] of wins) if (r.attempts >= 1 && r.attempts <= MAX_ATTEMPTS) distribution[r.attempts - 1]++;
  return {
    played: entries.length,
    won: wins.length,
    winRate: entries.length ? Math.round((wins.length / entries.length) * 100) : 0,
    currentStreak: computeStreak(winNumbers, currentNumber),
    bestStreak: best,
    distribution,
  };
}

export function useWordleStats(currentNumber: number): WordleStats {
  const [results] = useLocalStorage<Results>(RESULTS_KEY, NO_RESULTS);
  return useMemo(() => computeWordleStats(results, currentNumber), [results, currentNumber]);
}
