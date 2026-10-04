import "server-only";

import challenges from "@/data/daily-challenges.json";
import { createJsonChallengeStore, type ChallengeFile } from "@/lib/daily/challenge-store";
import { currentChallengeNumber } from "@/lib/daily/calendar";
import { GUESS_KEY_ENV, parseGuessKey } from "@/lib/guess/secret";
import { getPokedex } from "@/lib/pokemon/repository";
import { resolveDailyWordle, type DailyWordle } from "@/lib/wordle/daily";
import { deriveWordleKey } from "@/lib/wordle/secret";
import { buildWordleDictionary, type WordleDictionary } from "@/lib/wordle/words";

const store = createJsonChallengeStore(challenges as unknown as ChallengeFile);
const cache = new Map<number, DailyWordle>();
let dict: WordleDictionary | null = null;

function wordleKey(): Buffer | null {
  const platformKey = parseGuessKey(process.env[GUESS_KEY_ENV]);
  return platformKey ? deriveWordleKey(platformKey) : null;
}

export function getWordleDictionary(): WordleDictionary {
  dict ??= buildWordleDictionary(getPokedex().all);
  return dict;
}

/** Server-only access to the daily PokéWordle secret (memoised). It never reaches the client while playing. */
export function getDailyWordle(number: number): DailyWordle {
  let daily = cache.get(number);
  if (!daily) {
    daily = resolveDailyWordle(number, {
      dict: getWordleDictionary(),
      store,
      key: wordleKey(),
      onWarning: (message) => console.warn(`[wordle] ${message}`),
    });
    if (daily.source !== "unavailable") cache.set(number, daily);
  }
  return daily;
}

export function getTodaysWordle(now: Date = new Date()): DailyWordle {
  return getDailyWordle(currentChallengeNumber(now));
}
