import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import challenges from "@/data/daily-challenges.json";
import { resolveDailyCry, type DailyCry } from "@/lib/cry/daily";
import { prepareCryData, type CryData } from "@/lib/cry/generator";
import { cryAudioName, crySourceUrl, deriveCryKey, openCryAudio } from "@/lib/cry/secret";
import { CRY_ROUNDS } from "@/lib/cry/types";
import { createJsonChallengeStore, type ChallengeFile } from "@/lib/daily/challenge-store";
import { currentChallengeNumber } from "@/lib/daily/calendar";
import { GUESS_KEY_ENV, parseGuessKey } from "@/lib/guess/secret";
import { getPokedex } from "@/lib/pokemon/repository";

const store = createJsonChallengeStore(challenges as unknown as ChallengeFile);
const cache = new Map<number, DailyCry>();
let data: CryData | null = null;

/** Prepared, encrypted cries (see scripts/freeze-cry.ts). Traced into the server bundle by next.config.ts. */
export const CRIES_DIR = path.join(process.cwd(), "data", "cries");

function cryKey(): Buffer | null {
  const platformKey = parseGuessKey(process.env[GUESS_KEY_ENV]);
  return platformKey ? deriveCryKey(platformKey) : null;
}

/** Server-only access to the daily PokéCry (memoised). The answers never leave the server ahead of time. */
export function getDailyCry(number: number): DailyCry {
  let daily = cache.get(number);
  if (!daily) {
    data ??= prepareCryData(getPokedex().all);
    daily = resolveDailyCry(number, { data, store, key: cryKey(), onWarning: (message) => console.warn(`[cry] ${message}`) });
    if (daily.source !== "unavailable") cache.set(number, daily);
  }
  return daily;
}

export function getTodaysCry(now: Date = new Date()): DailyCry {
  return getDailyCry(currentChallengeNumber(now));
}

/**
 * The cry of round `round` (1-based) of day `number`, for the audio endpoint.
 * 1. the prepared MP3 (decrypted from data/cries) — plays everywhere;
 * 2. fallback: the original Ogg fetched server-side from PokéAPI (the Pokémon
 *    id never reaches the browser either way);
 * null if the day/round is not playable or both sources fail.
 */
export async function getCryAudio(number: number, round: number): Promise<{ body: Buffer; type: string } | null> {
  if (!Number.isInteger(number) || number < 1 || number > currentChallengeNumber()) return null;
  if (!Number.isInteger(round) || round < 1 || round > CRY_ROUNDS) return null;
  const key = cryKey();
  const { challenge } = getDailyCry(number);
  if (!key || !challenge) return null;
  const id = challenge.rounds[round - 1].answer;
  try {
    const mp3 = openCryAudio(await readFile(path.join(CRIES_DIR, cryAudioName(key, id))), id, key);
    if (mp3) return { body: mp3, type: "audio/mpeg" };
  } catch {
    // not prepared: fall through to the remote source
  }
  try {
    const res = await fetch(crySourceUrl(id), { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      console.warn(`[cry] #${number} round ${round}: served the remote fallback (prepare cries with npm run cry:freeze).`);
      return { body: Buffer.from(await res.arrayBuffer()), type: "audio/ogg" };
    }
  } catch {
    // remote unavailable
  }
  console.error(`[cry] #${number} round ${round}: no audio available.`);
  return null;
}
