/**
 * Generates and freezes daily Top 10 challenges into data/daily-challenges.json
 * (`top10` section), SEALED with a "top10" sub-key derived from GUESS_SECRET_KEY
 * (.env.local). The repository only ever contains ciphertext.
 *
 *   npm run top10:freeze                         # #1–#60, skips frozen days
 *   npm run top10:freeze -- --from 61 --days 30  # extend the runway
 *   npm run top10:freeze -- --dry-run
 *   npm run top10:freeze -- --reveal             # print rankings (local console only!)
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import type { StoredChallenge } from "../lib/daily/challenge-store";
import { dateForChallengeNumber, formatChallengeNumber } from "../lib/daily/calendar";
import { GUESS_KEY_ENV } from "../lib/guess/secret";
import { prepareQuartetsData } from "../lib/quartets/generator";
import { generateDailyTop10, type FrozenTop10 } from "../lib/top10/daily";
import { top10Level, TOP10_VERSION } from "../lib/top10/generator";
import { criterionView } from "../lib/top10/play";
import { deriveTop10Key, openTop10, sealTop10 } from "../lib/top10/secret";
import type { Top10Challenge } from "../lib/top10/types";
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
const key = deriveTop10Key(platformKey);
const pokedex = loadPokedex();
const data = prepareQuartetsData(pokedex.all);
const dataset = datasetFingerprint();
const file = loadChallengeFile();
const frozen = (file.top10 ??= {}) as Record<string, StoredChallenge<FrozenTop10>>;

const challenges = new Map<number, Top10Challenge>();
for (const [n, entry] of Object.entries(frozen)) {
  const challenge = openTop10(entry.payload.challenge, Number(n), key);
  if (!challenge) {
    console.error(`✖ Frozen Top 10 #${n} cannot be decrypted with this ${GUESS_KEY_ENV}. Wrong key?`);
    process.exit(1);
  }
  challenges.set(Number(n), challenge);
}

let generated = 0, kept = 0, fallbacks = 0, attempts = 0;
console.log("| # | Date | Level | Score | Notable | Type clues | Candidates | Status |");
console.log("|---|---|---|---|---|---|---|---|");
for (let number = from; number < from + days; number++) {
  if (frozen[String(number)]) {
    kept++;
    continue;
  }
  const result = generateDailyTop10(number, { data, key, lookup: (n) => challenges.get(n) ?? null });
  challenges.set(number, result.challenge);
  frozen[String(number)] = {
    number,
    date: dateForChallengeNumber(number),
    payload: {
      challenge: sealTop10(result.challenge, number, key),
      generatorVersion: TOP10_VERSION,
      fallbackStep: result.fallbackStep,
      dataset,
      salt: randomBytes(8).toString("hex"),
      frozenAt: new Date().toISOString(),
    },
  };
  generated++;
  attempts += result.attempts;
  if (result.fallbackStep > 0) fallbacks++;
  const a = result.analysis;
  console.log(
    `| ${formatChallengeNumber(number)} | ${dateForChallengeNumber(number)} | ${top10Level(dateForChallengeNumber(number))} | ${a.score.toFixed(2)} | ${a.notable}/10 | ${a.distinctClues} distinct | ${a.candidates} | ${result.fallbackStep ? `FALLBACK ${result.fallbackStep}` : "new"} |`,
  );
  if (reveal) {
    const c = criterionView(result.challenge);
    console.log(`|   | ${c.title}: ${result.challenge.ranking.map((e) => pokedex.getById(e.id)!.name).join(", ")} |`);
  }
}

console.log(`\nTop 10 v${TOP10_VERSION} · generated ${generated}, kept ${kept}, fallbacks ${fallbacks}, candidates ${attempts}`);
if (dryRun) {
  console.log("(dry run — nothing written)");
} else {
  writeFileSync(CHALLENGES_FILE, JSON.stringify(file, null, 2) + "\n");
  console.log("✔ Saved to data/daily-challenges.json (challenges sealed)");
}
