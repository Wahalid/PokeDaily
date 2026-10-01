import type { GameId } from "@/lib/games/registry";
import { readLocal, useLocalStorage, writeLocal } from "./local-store";

/** Completed challenge numbers per game, shared by every PokeDaily game. */
type Completions = Partial<Record<GameId, number[]>>;

const KEY = "pokedaily:completions";
const EMPTY: Completions = {};

export function recordCompletion(game: GameId, number: number): void {
  const all = readLocal<Completions>(KEY, EMPTY);
  const done = new Set(all[game] ?? []);
  done.add(number);
  writeLocal<Completions>(KEY, { ...all, [game]: [...done].sort((a, b) => a - b) });
}

/** Consecutive completed days ending today (or yesterday, if today isn't done yet). */
export function computeStreak(completed: readonly number[], currentNumber: number): number {
  const set = new Set(completed);
  let day = set.has(currentNumber) ? currentNumber : currentNumber - 1;
  let streak = 0;
  while (set.has(day)) {
    streak++;
    day--;
  }
  return streak;
}

export function useStreak(game: GameId, currentNumber: number): number {
  const [completions] = useLocalStorage<Completions>(KEY, EMPTY);
  return computeStreak(completions[game] ?? [], currentNumber);
}
