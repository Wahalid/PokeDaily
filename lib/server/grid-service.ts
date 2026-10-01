import "server-only";

import challenges from "@/data/daily-challenges.json";
import { createJsonChallengeStore, type ChallengeFile } from "@/lib/daily/challenge-store";
import { currentChallengeNumber } from "@/lib/daily/calendar";
import { resolveDailyGrid, type DailyGrid } from "@/lib/grid/daily";
import { getPokedex } from "@/lib/pokemon/repository";

const store = createJsonChallengeStore(challenges as unknown as ChallengeFile);
const cache = new Map<number, DailyGrid>();

/**
 * Server entry point for daily Grids (memoised per challenge number).
 * Frozen grids are served as-is; resolution never throws (see resolveDailyGrid).
 */
export function getDailyGrid(number: number): DailyGrid {
  let grid = cache.get(number);
  if (!grid) {
    grid = resolveDailyGrid(number, {
      pokemon: getPokedex().all,
      store,
      onWarning: (message) => console.warn(`[grid] ${message}`),
    });
    cache.set(number, grid);
  }
  return grid;
}

export function getTodaysGrid(now: Date = new Date()): DailyGrid {
  return getDailyGrid(currentChallengeNumber(now));
}

/** Only today's and past challenges are playable. */
export function isPlayableChallenge(number: number, now: Date = new Date()): boolean {
  return Number.isInteger(number) && number >= 1 && number <= currentChallengeNumber(now);
}
