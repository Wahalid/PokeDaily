import "server-only";

import challenges from "@/data/daily-challenges.json";
import { createJsonChallengeStore, type ChallengeFile } from "@/lib/daily/challenge-store";
import { currentChallengeNumber } from "@/lib/daily/calendar";
import { GUESS_KEY_ENV, parseGuessKey } from "@/lib/guess/secret";
import { resolveDailyImpostor, type DailyImpostor } from "@/lib/impostor/daily";
import { prepareImpostorData, type ImpostorData } from "@/lib/impostor/generator";
import { deriveImpostorKey } from "@/lib/impostor/secret";
import { getPokedex } from "@/lib/pokemon/repository";

const store = createJsonChallengeStore(challenges as unknown as ChallengeFile);
const cache = new Map<number, DailyImpostor>();
let data: ImpostorData | null = null;

function impostorKey(): Buffer | null {
  const platformKey = parseGuessKey(process.env[GUESS_KEY_ENV]);
  return platformKey ? deriveImpostorKey(platformKey) : null;
}

/** Server-only access to the daily PokéImpostor board (memoised). The impostors never leave the server while playing. */
export function getDailyImpostor(number: number): DailyImpostor {
  let daily = cache.get(number);
  if (!daily) {
    data ??= prepareImpostorData(getPokedex().all);
    daily = resolveDailyImpostor(number, {
      data,
      store,
      key: impostorKey(),
      onWarning: (message) => console.warn(`[impostor] ${message}`),
    });
    if (daily.source !== "unavailable") cache.set(number, daily);
  }
  return daily;
}

export function getTodaysImpostor(now: Date = new Date()): DailyImpostor {
  return getDailyImpostor(currentChallengeNumber(now));
}
