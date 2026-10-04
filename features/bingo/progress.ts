import { useMemo } from "react";
import type { BingoMove, BingoPublicState } from "@/lib/bingo/types";
import { readLocal, useLocalStorage, writeLocal } from "@/lib/storage/local-store";
import { computeStreak, recordCompletion } from "@/lib/storage/streaks";

/** What is saved per day: the moves (authoritative input) and the last server state. */
export interface StoredBingo {
  /** Opaque daily key; progress for a different key (re-frozen day) is ignored. */
  key?: string;
  moves: BingoMove[];
  state?: BingoPublicState;
}

const EMPTY: StoredBingo = { moves: [] };

/** One localStorage entry per challenge number, so a new day starts a new game automatically. */
export const bingoStorageKey = (challengeNumber: number) => `pokedaily:bingo:${challengeNumber}`;

/** Pure: returns the saved progress if it belongs to this puzzle, otherwise a fresh game. */
export function restoreBingo(raw: StoredBingo | null | undefined, progressKey: string, initial: BingoPublicState) {
  const valid = !!raw && raw.key === progressKey && Array.isArray(raw.moves) && !!raw.state;
  return valid ? { moves: raw!.moves, state: raw!.state! } : { moves: [] as BingoMove[], state: initial };
}

export function useBingoProgress(challengeNumber: number, progressKey: string, initial: BingoPublicState) {
  const storageKey = bingoStorageKey(challengeNumber);
  const [stored] = useLocalStorage<StoredBingo>(storageKey, EMPTY);
  const { moves, state } = restoreBingo(stored, progressKey, initial);
  const save = (nextMoves: BingoMove[], nextState: BingoPublicState) =>
    writeLocal<StoredBingo>(storageKey, { key: progressKey, moves: nextMoves, state: nextState });
  return { moves, state, save };
}

// ---- Statistics (PokéBingo only, this device) ---------------------------------

type Results = Record<string, { won: boolean; filled: number }>;
const RESULTS_KEY = "pokedaily:results:bingo";
const NO_RESULTS: Results = {};

export function recordBingoResult(challengeNumber: number, won: boolean, filled: number): void {
  const results = readLocal<Results>(RESULTS_KEY, NO_RESULTS);
  if (results[String(challengeNumber)]) return;
  writeLocal<Results>(RESULTS_KEY, { ...results, [String(challengeNumber)]: { won, filled } });
  if (won) recordCompletion("bingo", challengeNumber);
}

export interface BingoStats {
  played: number;
  won: number;
  lost: number;
  currentStreak: number;
  bestStreak: number;
  avgFilled: number;
}

/** Pure computation, exported for tests. */
export function computeBingoStats(results: Results, currentNumber: number): BingoStats {
  const entries = Object.entries(results);
  const wins = entries.filter(([, r]) => r.won).map(([n]) => Number(n)).sort((a, b) => a - b);
  let best = 0, run = 0, prev = -1;
  for (const n of wins) {
    run = n === prev + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = n;
  }
  const filled = entries.reduce((sum, [, r]) => sum + r.filled, 0);
  return {
    played: entries.length,
    won: wins.length,
    lost: entries.length - wins.length,
    currentStreak: computeStreak(wins, currentNumber),
    bestStreak: best,
    avgFilled: entries.length ? Math.round((filled / entries.length) * 10) / 10 : 0,
  };
}

export function useBingoStats(currentNumber: number): BingoStats {
  const [results] = useLocalStorage<Results>(RESULTS_KEY, NO_RESULTS);
  return useMemo(() => computeBingoStats(results, currentNumber), [results, currentNumber]);
}
