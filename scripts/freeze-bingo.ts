/**
 * Generates and freezes daily PokéBingo challenges into data/daily-challenges.json
 * (`bingo` section), SEALED with a "bingo" sub-key derived from GUESS_SECRET_KEY
 * (.env.local). The repository only ever contains ciphertext.
 *
 *   npm run bingo:freeze                         # #1–#60, skips frozen days
 *   npm run bingo:freeze -- --from 61 --days 30  # extend the runway
 *   npm run bingo:freeze -- --dry-run
 *   npm run bingo:freeze -- --reveal             # print boards (local console only!)
 *   npm run bingo:freeze -- --repair             # re-validate frozen days with the current rules and
 *                                                # fix ONLY the invalid ones (dead cards replaced in place)
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { generateDailyBingo, type FrozenBingo } from "../lib/bingo/daily";
import { analyzeBingo, BINGO_VERSION, repairDeadCards } from "../lib/bingo/generator";
import { bingoSeed, deriveBingoKey, openBingo, sealBingo } from "../lib/bingo/secret";
import type { BingoChallenge } from "../lib/bingo/types";
import type { StoredChallenge } from "../lib/daily/challenge-store";
import { dateForChallengeNumber, formatChallengeNumber } from "../lib/daily/calendar";
import { GUESS_KEY_ENV } from "../lib/guess/secret";
import { getQuartetCategory } from "../lib/quartets/categories";
import { prepareQuartetsData } from "../lib/quartets/generator";
import { CHALLENGES_FILE, datasetFingerprint, loadChallengeFile, loadGuessKey, loadPokedex } from "./lib/load-data";

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

const from = arg("from", 1);
const days = arg("days", 60);
const dryRun = process.argv.includes("--dry-run");
const reveal = process.argv.includes("--reveal");
const repair = process.argv.includes("--repair");

const platformKey = loadGuessKey();
if (!platformKey) {
  console.error(`✖ ${GUESS_KEY_ENV} is missing or invalid. Add it to .env.local (64 hex characters).`);
  process.exit(1);
}
const key = deriveBingoKey(platformKey);
const pokedex = loadPokedex();
const data = prepareQuartetsData(pokedex.all);
const dataset = datasetFingerprint();
const file = loadChallengeFile();
const frozen = (file.bingo ??= {}) as Record<string, StoredChallenge<FrozenBingo>>;

const challenges = new Map<number, BingoChallenge>();
for (const [n, entry] of Object.entries(frozen)) {
  const challenge = openBingo(entry.payload.challenge, Number(n), key);
  if (!challenge) {
    console.error(`✖ Frozen PokéBingo #${n} cannot be decrypted with this ${GUESS_KEY_ENV}. Wrong key?`);
    process.exit(1);
  }
  challenges.set(Number(n), challenge);
}

let repaired = 0;
if (repair) {
  // Frozen boards that break the current rules are fixed with the smallest change:
  // cells kept, only the offending cards replaced (same positions); a board whose
  // cells are the problem is regenerated. Valid boards are left untouched.
  for (const [n, challenge] of [...challenges].sort((a, b) => a[0] - b[0])) {
    const before = analyzeBingo(challenge, data).problems;
    if (before.length === 0) continue;
    let fixed = repairDeadCards(challenge, data, bingoSeed(key, n, `${BINGO_VERSION}:repair`));
    let how = "cards replaced";
    if (analyzeBingo(fixed, data).problems.length) {
      fixed = generateDailyBingo(n, { data, key, lookup: (d) => challenges.get(d) ?? null }).challenge;
      how = "regenerated";
    }
    const after = analyzeBingo(fixed, data).problems;
    if (after.length) {
      console.error(`✖ #${n} could not be repaired: ${after.join(", ")}`);
      process.exit(1);
    }
    const swaps = challenge.deck.flatMap((id, i) => (fixed.deck[i] !== id ? [`turno ${i + 1}: ${pokedex.getById(id)!.name} → ${pokedex.getById(fixed.deck[i])!.name}`] : []));
    console.log(`#${n} [${[...new Set(before)].join(", ")}] → ${how}${reveal ? ` (${swaps.join("; ")})` : ` (${swaps.length} card(s))`}`);
    challenges.set(n, fixed);
    const entry = frozen[String(n)];
    entry.payload = {
      ...entry.payload,
      challenge: sealBingo(fixed, n, key),
      generatorVersion: BINGO_VERSION,
      // New progress key: progress saved for the old board is ignored.
      salt: randomBytes(8).toString("hex"),
      frozenAt: new Date().toISOString(),
    };
    repaired++;
  }
  console.log(`Repaired ${repaired} of ${challenges.size} frozen PokéBingo boards.`);
}

let generated = 0, kept = 0, fallbacks = 0, attempts = 0;
const rejections: Record<string, number> = {};
console.log("| # | Date | Recognisable | Options/card | Dead cards | Candidates | Status |");
console.log("|---|---|---|---|---|---|---|");
for (let number = from; number < from + days; number++) {
  if (frozen[String(number)]) {
    kept++;
    continue;
  }
  const result = generateDailyBingo(number, { data, key, lookup: (n) => challenges.get(n) ?? null });
  challenges.set(number, result.challenge);
  frozen[String(number)] = {
    number,
    date: dateForChallengeNumber(number),
    payload: {
      challenge: sealBingo(result.challenge, number, key),
      generatorVersion: BINGO_VERSION,
      fallbackStep: result.fallbackStep,
      dataset,
      salt: randomBytes(8).toString("hex"),
      frozenAt: new Date().toISOString(),
    },
  };
  generated++;
  attempts += result.attempts;
  if (result.fallbackStep > 0) fallbacks++;
  for (const [k, v] of Object.entries(result.rejections)) rejections[k] = (rejections[k] ?? 0) + v;
  const a = result.analysis;
  console.log(
    `| ${formatChallengeNumber(number)} | ${dateForChallengeNumber(number)} | ${a.recognizable}/24 | ${a.avgOptions.toFixed(2)} | ${a.deadCards} | ${result.attempts} | ${result.fallbackStep ? `FALLBACK ${result.fallbackStep}` : "new"} |`,
  );
  if (reveal) {
    console.log(`|   | cells: ${result.challenge.cells.map((id) => getQuartetCategory(id)?.short ?? id).join(" · ")} |`);
    console.log(`|   | deck: ${result.challenge.deck.map((id) => pokedex.getById(id)!.name).join(", ")} |`);
  }
}

const total = Object.values(rejections).reduce((x, y) => x + y, 0);
console.log(`\nPokéBingo v${BINGO_VERSION} · generated ${generated}, kept ${kept}, fallbacks ${fallbacks}, candidates ${attempts}`);
console.log(`Rejected candidates: ${total} — ${Object.entries(rejections).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`);
if (dryRun) {
  console.log("(dry run — nothing written)");
} else {
  writeFileSync(CHALLENGES_FILE, JSON.stringify(file, null, 2) + "\n");
  console.log("✔ Saved to data/daily-challenges.json (challenges sealed)");
}
