import "server-only";

import challenges from "@/data/daily-challenges.json";
import { resolveDailyBingo, type DailyBingo } from "@/lib/bingo/daily";
import { deriveBingoKey } from "@/lib/bingo/secret";
import { createJsonChallengeStore, type ChallengeFile } from "@/lib/daily/challenge-store";
import { currentChallengeNumber } from "@/lib/daily/calendar";
import { GUESS_KEY_ENV, parseGuessKey } from "@/lib/guess/secret";
import { getPokedex } from "@/lib/pokemon/repository";
import { prepareQuartetsData, type QuartetsData } from "@/lib/quartets/generator";

const store = createJsonChallengeStore(challenges as unknown as ChallengeFile);
const cache = new Map<number, DailyBingo>();
let data: QuartetsData | null = null;

function bingoKey(): Buffer | null {
  const platformKey = parseGuessKey(process.env[GUESS_KEY_ENV]);
  return platformKey ? deriveBingoKey(platformKey) : null;
}

/** Server-only access to the daily PokéBingo (memoised). The deck never leaves the server in bulk. */
export function getDailyBingo(number: number): DailyBingo {
  let daily = cache.get(number);
  if (!daily) {
    data ??= prepareQuartetsData(getPokedex().all);
    daily = resolveDailyBingo(number, {
      data,
      store,
      key: bingoKey(),
      onWarning: (message) => console.warn(`[bingo] ${message}`),
    });
    if (daily.source !== "unavailable") cache.set(number, daily);
  }
  return daily;
}

export function getTodaysBingo(now: Date = new Date()): DailyBingo {
  return getDailyBingo(currentChallengeNumber(now));
}
