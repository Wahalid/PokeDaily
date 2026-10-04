import "server-only";

import challenges from "@/data/daily-challenges.json";
import { createJsonChallengeStore, type ChallengeFile } from "@/lib/daily/challenge-store";
import { currentChallengeNumber } from "@/lib/daily/calendar";
import { GUESS_KEY_ENV, parseGuessKey } from "@/lib/guess/secret";
import { getPokedex } from "@/lib/pokemon/repository";
import { prepareQuartetsData, type QuartetsData } from "@/lib/quartets/generator";
import { resolveDailyTop10, type DailyTop10 } from "@/lib/top10/daily";
import { deriveTop10Key } from "@/lib/top10/secret";

const store = createJsonChallengeStore(challenges as unknown as ChallengeFile);
const cache = new Map<number, DailyTop10>();
let data: QuartetsData | null = null;

function top10Key(): Buffer | null {
  const platformKey = parseGuessKey(process.env[GUESS_KEY_ENV]);
  return platformKey ? deriveTop10Key(platformKey) : null;
}

/** Server-only access to the daily Top 10 (memoised). The ranking never leaves the server in bulk. */
export function getDailyTop10(number: number): DailyTop10 {
  let daily = cache.get(number);
  if (!daily) {
    data ??= prepareQuartetsData(getPokedex().all);
    daily = resolveDailyTop10(number, {
      data,
      store,
      key: top10Key(),
      onWarning: (message) => console.warn(`[top10] ${message}`),
    });
    if (daily.source !== "unavailable") cache.set(number, daily);
  }
  return daily;
}

export function getTodaysTop10(now: Date = new Date()): DailyTop10 {
  return getDailyTop10(currentChallengeNumber(now));
}
