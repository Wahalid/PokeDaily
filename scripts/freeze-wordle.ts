/**
 * Generates and freezes daily PokéWordle secrets into data/daily-challenges.json
 * (`wordle` section), SEALED with a "wordle" sub-key derived from GUESS_SECRET_KEY
 * (.env.local). The repository only ever contains fixed-size ciphertext.
 *
 *   npm run wordle:freeze                         # #1–#60, skips frozen days
 *   npm run wordle:freeze -- --from 61 --days 30  # extend the runway
 *   npm run wordle:freeze -- --dry-run
 *   npm run wordle:freeze -- --reveal             # print the secrets (local console only!)
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import type { StoredChallenge } from "../lib/daily/challenge-store";
import { dateForChallengeNumber, formatChallengeNumber } from "../lib/daily/calendar";
import { GUESS_KEY_ENV } from "../lib/guess/secret";
import { generateDailyWordle, type FrozenWordle } from "../lib/wordle/daily";
import { WORDLE_VERSION } from "../lib/wordle/generator";
import { deriveWordleKey, openWordle, sealWordle } from "../lib/wordle/secret";
import type { WordleChallenge } from "../lib/wordle/types";
import { buildWordleDictionary } from "../lib/wordle/words";
import { CHALLENGES_FILE, datasetFingerprint, loadChallengeFile, loadGuessKey, loadPokedex } from "./lib/load-data";

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

const from = arg("from", 1);
const days = arg("days", 60);
const dryRun = process.argv.includes("--dry-run");
const reveal = process.argv.includes("--reveal");

const platformKey = loadGuessKey();
if (!platformKey) {
  console.error(`✖ ${GUESS_KEY_ENV} is missing or invalid. Add it to .env.local (64 hex characters).`);
  process.exit(1);
}
const key = deriveWordleKey(platformKey);
const dict = buildWordleDictionary(loadPokedex().all);
const dataset = datasetFingerprint();
const file = loadChallengeFile();
const frozen = (file.wordle ??= {}) as Record<string, StoredChallenge<FrozenWordle>>;

const challenges = new Map<number, WordleChallenge>();
for (const [n, entry] of Object.entries(frozen)) {
  const challenge = openWordle(entry.payload.challenge, Number(n), key);
  if (!challenge) {
    console.error(`✖ Frozen PokéWordle #${n} cannot be decrypted with this ${GUESS_KEY_ENV}. Wrong key?`);
    process.exit(1);
  }
  challenges.set(Number(n), challenge);
}

let generated = 0, kept = 0, fallbacks = 0;
const lengths: Record<number, number> = {};
for (let number = from; number < from + days; number++) {
  if (frozen[String(number)]) {
    kept++;
    continue;
  }
  const result = generateDailyWordle(number, { dict, key, lookup: (n) => challenges.get(n) ?? null });
  challenges.set(number, result.challenge);
  frozen[String(number)] = {
    number,
    date: dateForChallengeNumber(number),
    payload: {
      challenge: sealWordle(result.challenge, number, key),
      generatorVersion: WORDLE_VERSION,
      fallbackStep: result.fallbackStep,
      dataset,
      salt: randomBytes(8).toString("hex"),
      frozenAt: new Date().toISOString(),
    },
  };
  generated++;
  if (result.fallbackStep > 0) fallbacks++;
  const len = result.challenge.word.length;
  lengths[len] = (lengths[len] ?? 0) + 1;
  // Only the length is printed by default (no spoilers in shared terminals / CI logs).
  console.log(
    `${formatChallengeNumber(number)} ${dateForChallengeNumber(number)} · ${len} letters${result.fallbackStep ? ` · FALLBACK ${result.fallbackStep}` : ""}${
      reveal ? ` · ${dict.byWord.get(result.challenge.word)!.name}` : ""
    }`,
  );
}

console.log(`\nPokéWordle v${WORDLE_VERSION} · generated ${generated}, kept ${kept}, fallbacks ${fallbacks}`);
console.log("Lengths:", JSON.stringify(lengths));
if (dryRun) {
  console.log("(dry run — nothing written)");
} else {
  writeFileSync(CHALLENGES_FILE, JSON.stringify(file, null, 2) + "\n");
  console.log("✔ Saved to data/daily-challenges.json (secrets sealed)");
}
