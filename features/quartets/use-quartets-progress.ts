import { useMemo } from "react";
import type { SolvedGroupView } from "@/lib/quartets/types";
import { readLocal, useLocalStorage, writeLocal } from "@/lib/storage/local-store";
import { computeStreak, recordCompletion } from "@/lib/storage/streaks";

export type AttemptResult = "correct" | "one-away" | "wrong";
export interface Attempt {
  ids: number[];
  result: AttemptResult;
}

interface StoredQuartets {
  /** Opaque daily key; progress saved for a different key is ignored. */
  key?: string;
  /** Current display order of the 16 cards (shuffles persist). */
  order: number[];
  solved: SolvedGroupView[];
  attempts: Attempt[];
  /** Legacy: all groups, saved when a game was lost under the old lives rule (no longer possible). */
  revealed?: SolvedGroupView[];
}

const EMPTY: StoredQuartets = { order: [], solved: [], attempts: [] };

export const attemptKey = (ids: readonly number[]) => [...ids].sort((a, b) => a - b).join(",");

/**
 * Game status from saved progress. Mistakes have no penalty: the game only
 * ends when the 4 groups are found. `lost` only exists for progress saved
 * under the old lives rule (groups already revealed), so it can't be resumed.
 */
export function quartetsStatus(state: { solved: readonly unknown[]; attempts: readonly Attempt[]; revealed?: readonly unknown[] }) {
  const mistakes = state.attempts.filter((a) => a.result !== "correct").length;
  const won = state.solved.length === 4;
  const lost = !won && (state.revealed?.length ?? 0) > 0;
  return { mistakes, won, lost };
}

/** Player progress for one daily Cuartetos, persisted in localStorage. */
export function useQuartetsProgress(challengeNumber: number, progressKey: string, initialOrder: number[]) {
  const storageKey = `pokedaily:quartets:${challengeNumber}`;
  const [stored] = useLocalStorage<StoredQuartets>(storageKey, EMPTY);
  const normalize = (s: StoredQuartets): StoredQuartets =>
    s.key === progressKey && Array.isArray(s.attempts) ? s : { ...EMPTY, order: initialOrder };
  const state = normalize(stored);

  const { mistakes, won, lost } = quartetsStatus(state);
  const triedKeys = useMemo(() => new Set(state.attempts.map((a) => attemptKey(a.ids))), [state.attempts]);

  // Always patch the latest stored state (several saves can happen in one async flow).
  const save = (patch: (current: StoredQuartets) => Partial<StoredQuartets>) => {
    const current = normalize(readLocal<StoredQuartets>(storageKey, EMPTY));
    writeLocal<StoredQuartets>(storageKey, { ...current, ...patch(current), key: progressKey });
  };

  return {
    order: state.order.length ? state.order : initialOrder,
    solved: state.solved,
    attempts: state.attempts,
    revealed: state.revealed,
    mistakes,
    won,
    lost,
    triedKeys,
    setOrder: (order: number[]) => save(() => ({ order })),
    addAttempt: (attempt: Attempt, group?: SolvedGroupView) =>
      save((c) => ({ attempts: [...c.attempts, attempt], solved: group ? [...c.solved, group] : c.solved })),
  };
}

// ---- Local statistics (this device only) --------------------------------------

type Results = Record<string, { won: boolean; mistakes: number }>;
const RESULTS_KEY = "pokedaily:results:connections";
const NO_RESULTS: Results = {};

export function recordQuartetsResult(challengeNumber: number, won: boolean, mistakes: number): void {
  const results = readLocal<Results>(RESULTS_KEY, NO_RESULTS);
  if (results[String(challengeNumber)]) return;
  writeLocal<Results>(RESULTS_KEY, { ...results, [String(challengeNumber)]: { won, mistakes } });
  if (won) recordCompletion("connections", challengeNumber);
}

export interface QuartetsStats {
  played: number;
  won: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
}

export function useQuartetsStats(currentNumber: number): QuartetsStats {
  const [results] = useLocalStorage<Results>(RESULTS_KEY, NO_RESULTS);
  return useMemo(() => {
    const entries = Object.entries(results);
    const wins = entries.filter(([, r]) => r.won).map(([n]) => Number(n)).sort((a, b) => a - b);
    let best = 0, run = 0, prev = -1;
    for (const n of wins) {
      run = n === prev + 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = n;
    }
    return {
      played: entries.length,
      won: wins.length,
      winRate: entries.length ? Math.round((wins.length / entries.length) * 100) : 0,
      currentStreak: computeStreak(wins, currentNumber),
      bestStreak: best,
    };
  }, [results, currentNumber]);
}
