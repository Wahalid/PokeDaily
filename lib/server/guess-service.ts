import "server-only";

import challenges from "@/data/daily-challenges.json";
import { createJsonChallengeStore, type ChallengeFile } from "@/lib/daily/challenge-store";
import { currentChallengeNumber } from "@/lib/daily/calendar";
import { resolveDailyGuess, type DailyGuess } from "@/lib/guess/daily";
import { GUESS_KEY_ENV, parseGuessKey } from "@/lib/guess/secret";
import { getPokedex } from "@/lib/pokemon/repository";

const store = createJsonChallengeStore(challenges as unknown as ChallengeFile);
const cache = new Map<number, DailyGuess>();

/**
 * Server-only access to the daily secret Pokémon (memoised per challenge).
 * The secret is never sent to the client until the game is over, and the key
 * to decrypt it lives only in the server environment (GUESS_SECRET_KEY).
 */
export function getDailyGuess(number: number): DailyGuess {
  let guess = cache.get(number);
  if (!guess) {
    guess = resolveDailyGuess(number, {
      pokemon: getPokedex().all,
      store,
      key: parseGuessKey(process.env[GUESS_KEY_ENV]),
      onWarning: (message) => console.warn(`[guess] ${message}`),
    });
    // Don't memoise an unavailable result, so fixing the env var takes effect without a stale cache.
    if (guess.source !== "unavailable") cache.set(number, guess);
  }
  return guess;
}

export function getTodaysGuess(now: Date = new Date()): DailyGuess {
  return getDailyGuess(currentChallengeNumber(now));
}
