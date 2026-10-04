/**
 * Generates and freezes daily Cuartetos boards into data/daily-challenges.json
 * (`connections` section), ENCRYPTED with a sub-key derived from
 * GUESS_SECRET_KEY (.env.local). The repository only ever contains ciphertext.
 *
 *   npm run quartets:freeze                         # #1–#60, skips frozen days
 *   npm run quartets:freeze -- --from 61 --days 30  # extend the runway
 *   npm run quartets:freeze -- --dry-run
 *   npm run quartets:freeze -- --reveal             # print solutions (local console only!)
 *
 * Days are generated in order so recency rules see previous days.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import type { StoredChallenge } from "../lib/daily/challenge-store";
import { dateForChallengeNumber, formatChallengeNumber } from "../lib/daily/calendar";
import { GUESS_KEY_ENV } from "../lib/guess/secret";
import { getQuartetCategory } from "../lib/quartets/categories";
import { generateDailyQuartets, type FrozenQuartets } from "../lib/quartets/daily";
import { prepareQuartetsData, QUARTETS_VERSION } from "../lib/quartets/generator";
import { decryptBoard, deriveQuartetsKey, encryptBoard } from "../lib/quartets/secret";
import { TIERS, type QuartetBoard } from "../lib/quartets/types";
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
const key = deriveQuartetsKey(platformKey);

const pokedex = loadPokedex();
const data = prepareQuartetsData(pokedex.all);
const dataset = datasetFingerprint();
const file = loadChallengeFile();
const frozen = (file.connections ??= {}) as Record<string, StoredChallenge<FrozenQuartets>>;

// Decrypted boards (in memory only), for recency of later days.
const boards = new Map<number, QuartetBoard>();
for (const [n, entry] of Object.entries(frozen)) {
  const board = decryptBoard(entry.payload.board, Number(n), key);
  if (!board) {
    console.error(`✖ Frozen Cuartetos #${n} cannot be decrypted with this ${GUESS_KEY_ENV}. Wrong key?`);
    process.exit(1);
  }
  boards.set(Number(n), board);
}

let generated = 0, kept = 0, fallbacks = 0, attempts = 0;
const rejections: Record<string, number> = {};
console.log("| # | Date | Level | Score | Recognisable | Herrings | Candidates | Status |");
console.log("|---|---|---|---|---|---|---|---|");
for (let number = from; number < from + days; number++) {
  if (frozen[String(number)]) {
    kept++;
    continue;
  }
  const result = generateDailyQuartets(number, { data, key, lookup: (n) => boards.get(n) ?? null });
  boards.set(number, result.board);
  frozen[String(number)] = {
    number,
    date: dateForChallengeNumber(number),
    payload: {
      board: encryptBoard(result.board, number, key),
      level: result.level,
      generatorVersion: QUARTETS_VERSION,
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
    `| ${formatChallengeNumber(number)} | ${dateForChallengeNumber(number)} | ${result.level} | ${a.score.toFixed(2)} | ${a.recognizable}/16 | ${a.herrings} | ${result.attempts} | ${result.fallbackStep ? `FALLBACK ${result.fallbackStep}` : "new"} |`,
  );
  if (reveal) {
    for (const g of [...result.board.groups].sort((x, y) => x.tier - y.tier)) {
      const names = g.pokemonIds.map((id) => pokedex.getById(id)!.name).join(", ");
      console.log(`|   | ${TIERS[g.tier].emoji} | ${getQuartetCategory(g.categoryId)!.label} | ${names} | | | | |`);
    }
  }
}

const total = Object.values(rejections).reduce((x, y) => x + y, 0);
console.log(`\nCuartetos v${QUARTETS_VERSION} · generated ${generated}, kept ${kept}, fallbacks ${fallbacks}, candidates ${attempts}`);
console.log(`Rejected candidates: ${total} — ${Object.entries(rejections).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`);
if (dryRun) {
  console.log("(dry run — nothing written)");
} else {
  writeFileSync(CHALLENGES_FILE, JSON.stringify(file, null, 2) + "\n");
  console.log("✔ Saved to data/daily-challenges.json (boards encrypted)");
}
