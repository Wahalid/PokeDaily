import { useMemo } from "react";
import type { Top10PublicState } from "@/lib/top10/types";
import { readLocal, useLocalStorage, writeLocal } from "@/lib/storage/local-store";
import { computeStreak, recordCompletion } from "@/lib/storage/streaks";

export type GuessOutcome = "correct" | "wrong";

/** What is saved per day: the guesses (authoritative input) and the last server state. */
export interface StoredTop10 {
  /** Opaque daily key; progress for a different key (re-frozen day) is ignored. */
  key?: string;
  guesses: number[];
  outcomes: GuessOutcome[];
  /** Number of guesses when the player used Give Up (absent while playing or after completing). */
  gaveUpAt?: number;
  state?: Top10PublicState;
}

const EMPTY: StoredTop10 = { guesses: [], outcomes: [] };

/** One localStorage entry per challenge number, so a new day starts a new game automatically. */
export const top10StorageKey = (challengeNumber: number) => `pokedaily:top10:${challengeNumber}`;

/** Pure: saved progress if it belongs to this puzzle, otherwise a fresh game. */
export function restoreTop10(raw: StoredTop10 | null | undefined, progressKey: string, initial: Top10PublicState) {
  // `clues` guards against the previous (clue-less) format; `lives` marks progress saved under the old lives rules.
  const valid =
    !!raw && raw.key === progressKey && Array.isArray(raw.guesses) && Array.isArray(raw.state?.clues) && !("lives" in raw.state!);
  return valid
    ? { guesses: raw!.guesses, outcomes: raw!.outcomes ?? [], gaveUpAt: raw!.gaveUpAt, state: raw!.state! }
    : { guesses: [] as number[], outcomes: [] as GuessOutcome[], gaveUpAt: undefined, state: initial };
}

export function useTop10Progress(challengeNumber: number, progressKey: string, initial: Top10PublicState) {
  const storageKey = top10StorageKey(challengeNumber);
  const [stored] = useLocalStorage<StoredTop10>(storageKey, EMPTY);
  const progress = restoreTop10(stored, progressKey, initial);
  const save = (guesses: number[], outcomes: GuessOutcome[], state: Top10PublicState, gaveUpAt?: number) =>
    writeLocal<StoredTop10>(storageKey, { key: progressKey, guesses, outcomes, gaveUpAt, state });
  return { ...progress, save };
}

// ---- Statistics (Top 10 only, this device) ------------------------------------

/** One finished game: completed (`won`) or given up. Older entries (lives rules) count as not completed. */
type Results = Record<string, { won: boolean; found: number; gaveUp?: boolean }>;
const RESULTS_KEY = "pokedaily:results:top10";
const NO_RESULTS: Results = {};

export function recordTop10Result(challengeNumber: number, won: boolean, found: number): void {
  const results = readLocal<Results>(RESULTS_KEY, NO_RESULTS);
  if (results[String(challengeNumber)]) return;
  writeLocal<Results>(RESULTS_KEY, { ...results, [String(challengeNumber)]: { won, found, gaveUp: !won } });
  if (won) recordCompletion("top10", challengeNumber);
}

export interface Top10Stats {
  played: number;
  /** Rankings completed. */
  won: number;
  /** Games ended with Give Up. */
  gaveUp: number;
  currentStreak: number;
  bestStreak: number;
  /** Average positions found per game. */
  avgFound: number;
}

/** Pure computation, exported for tests. */
export function computeTop10Stats(results: Results, currentNumber: number): Top10Stats {
  const entries = Object.entries(results);
  const wins = entries.filter(([, r]) => r.won);
  const winNumbers = wins.map(([n]) => Number(n)).sort((a, b) => a - b);
  let best = 0, run = 0, prev = -1;
  for (const n of winNumbers) {
    run = n === prev + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = n;
  }
  const found = entries.reduce((sum, [, r]) => sum + r.found, 0);
  return {
    played: entries.length,
    won: wins.length,
    gaveUp: entries.length - wins.length,
    currentStreak: computeStreak(winNumbers, currentNumber),
    bestStreak: best,
    avgFound: entries.length ? Math.round((found / entries.length) * 10) / 10 : 0,
  };
}

export function useTop10Stats(currentNumber: number): Top10Stats {
  const [results] = useLocalStorage<Results>(RESULTS_KEY, NO_RESULTS);
  return useMemo(() => computeTop10Stats(results, currentNumber), [results, currentNumber]);
}
