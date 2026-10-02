/**
 * Freezes the daily secret Pokémon for "Adivina el Pokémon" into
 * data/daily-challenges.json (`guess` section), ENCRYPTED with GUESS_SECRET_KEY
 * (from .env.local). The repository only ever contains ciphertext.
 *
 *   npm run guess:freeze                         # #1–#60, skips already-frozen days
 *   npm run guess:freeze -- --from 61 --days 30  # extend the runway
 *   npm run guess:freeze -- --dry-run            # no write
 *   npm run guess:freeze -- --reveal             # also print answers (local console only!)
 *
 * New days follow the secret shuffle and skip Pokémon already frozen, so no
 * answer repeats until the whole Pokédex has been used.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import type { StoredChallenge } from "../lib/daily/challenge-store";
import { dateForChallengeNumber, formatChallengeNumber } from "../lib/daily/calendar";
import { GUESS_VERSION, guessOrder, type FrozenGuess } from "../lib/guess/daily";
import { decryptAnswer, encryptAnswer, GUESS_KEY_ENV, secretOrderSeed } from "../lib/guess/secret";
import { CHALLENGES_FILE, datasetFingerprint, loadChallengeFile, loadGuessKey, loadPokedex } from "./lib/load-data";

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

const from = arg("from", 1);
const days = arg("days", 60);
const dryRun = process.argv.includes("--dry-run");
const reveal = process.argv.includes("--reveal");

const key = loadGuessKey();
if (!key) {
  console.error(`✖ ${GUESS_KEY_ENV} is missing or invalid. Add it to .env.local (64 hex characters).`);
  process.exit(1);
}

const pokedex = loadPokedex();
const dataset = datasetFingerprint();
const file = loadChallengeFile();
const frozen = (file.guess ??= {}) as Record<string, StoredChallenge<FrozenGuess>>;

// Answers already frozen (decrypted in memory only), to avoid repeats.
const used = new Set<number>();
for (const [n, entry] of Object.entries(frozen)) {
  const id = decryptAnswer(entry.payload.answer, Number(n), key);
  if (id === null) {
    console.error(`✖ Frozen guess #${n} cannot be decrypted with this ${GUESS_KEY_ENV}. Wrong key?`);
    process.exit(1);
  }
  used.add(id);
}

const order = guessOrder(pokedex.all, secretOrderSeed(key, GUESS_VERSION));
let cursor = 0;
const nextUnused = () => {
  for (let tries = 0; tries < order.length; tries++) {
    const id = order[cursor++ % order.length];
    if (!used.has(id)) return id;
  }
  used.clear(); // whole Pokédex used: start a new cycle
  return order[cursor++ % order.length];
};

let generated = 0, kept = 0;
for (let number = from; number < from + days; number++) {
  const existing = frozen[String(number)];
  if (existing) {
    kept++;
    if (reveal) console.log(`${formatChallengeNumber(number)}  kept  ${pokedex.getById(decryptAnswer(existing.payload.answer, number, key)!)!.name}`);
    continue;
  }
  const pokemonId = nextUnused();
  used.add(pokemonId);
  frozen[String(number)] = {
    number,
    date: dateForChallengeNumber(number),
    payload: {
      answer: encryptAnswer(pokemonId, number, key),
      generatorVersion: GUESS_VERSION,
      dataset,
      salt: randomBytes(8).toString("hex"),
      frozenAt: new Date().toISOString(),
    },
  };
  generated++;
  if (reveal) console.log(`${formatChallengeNumber(number)}  new   ${pokedex.getById(pokemonId)!.name}`);
}

console.log(`Guess v${GUESS_VERSION} · #${from}–#${from + days - 1}: generated ${generated}, kept ${kept} (answers encrypted)`);
if (dryRun) {
  console.log("(dry run — nothing written)");
} else {
  writeFileSync(CHALLENGES_FILE, JSON.stringify(file, null, 2) + "\n");
  console.log("✔ Saved to data/daily-challenges.json");
}
