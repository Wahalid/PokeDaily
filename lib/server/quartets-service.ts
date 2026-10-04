import "server-only";

import challenges from "@/data/daily-challenges.json";
import { createJsonChallengeStore, type ChallengeFile } from "@/lib/daily/challenge-store";
import { currentChallengeNumber } from "@/lib/daily/calendar";
import { GUESS_KEY_ENV, parseGuessKey } from "@/lib/guess/secret";
import { toSummary } from "@/lib/pokemon/pokedex";
import { getPokedex } from "@/lib/pokemon/repository";
import type { PokemonSummary } from "@/lib/pokemon/types";
import { resolveDailyQuartets, type DailyQuartets } from "@/lib/quartets/daily";
import { prepareQuartetsData, type QuartetsData } from "@/lib/quartets/generator";
import { deriveQuartetsKey } from "@/lib/quartets/secret";

const store = createJsonChallengeStore(challenges as unknown as ChallengeFile);
const cache = new Map<number, DailyQuartets>();
let data: QuartetsData | null = null;

function quartetsKey(): Buffer | null {
  const platformKey = parseGuessKey(process.env[GUESS_KEY_ENV]);
  return platformKey ? deriveQuartetsKey(platformKey) : null;
}

/**
 * Server-only access to the daily Cuartetos board (memoised per challenge).
 * The grouping never leaves the server except group by group as it is solved.
 */
export function getDailyQuartets(number: number): DailyQuartets {
  let daily = cache.get(number);
  if (!daily) {
    data ??= prepareQuartetsData(getPokedex().all);
    daily = resolveDailyQuartets(number, {
      data,
      store,
      key: quartetsKey(),
      onWarning: (message) => console.warn(`[quartets] ${message}`),
    });
    if (daily.source !== "unavailable") cache.set(number, daily);
  }
  return daily;
}

export function getTodaysQuartets(now: Date = new Date()): DailyQuartets {
  return getDailyQuartets(currentChallengeNumber(now));
}

/** The only board data the page may send to the client: the 16 cards, in initial order. */
export function publicCards(daily: DailyQuartets): PokemonSummary[] {
  if (!daily.board) return [];
  const pokedex = getPokedex();
  return daily.board.layout.map((id) => toSummary(pokedex.getById(id)!));
}
