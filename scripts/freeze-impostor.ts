/**
 * Generates, audits and freezes daily PokéImpostor boards into
 * data/daily-challenges.json (`impostor` section), SEALED with an "impostor"
 * sub-key derived from GUESS_SECRET_KEY (.env.local). Only ciphertext is stored.
 *
 *   npm run impostor:freeze                         # #1–#60, skips frozen days
 *   npm run impostor:freeze -- --from 61 --days 30  # extend the runway
 *   npm run impostor:freeze -- --dry-run            # audit only
 *   npm run impostor:freeze -- --reveal             # print boards (local console only!)
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import type { StoredChallenge } from "../lib/daily/challenge-store";
import { dateForChallengeNumber, formatChallengeNumber } from "../lib/daily/calendar";
import { GUESS_KEY_ENV } from "../lib/guess/secret";
import { getImpostorCategory } from "../lib/impostor/categories";
import { generateDailyImpostor, type FrozenImpostor } from "../lib/impostor/daily";
import { analyzeImpostor, impostorLevel, IMPOSTOR_VERSION, prepareImpostorData } from "../lib/impostor/generator";
import { deriveImpostorKey, openImpostor, sealImpostor } from "../lib/impostor/secret";
import type { ImpostorChallenge } from "../lib/impostor/types";
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
const key = deriveImpostorKey(platformKey);
const data = prepareImpostorData(loadPokedex().all);
const dataset = datasetFingerprint();
const file = loadChallengeFile();
const frozen = (file.impostor ??= {}) as Record<string, StoredChallenge<FrozenImpostor>>;

const challenges = new Map<number, ImpostorChallenge>();
for (const [n, entry] of Object.entries(frozen)) {
  const challenge = openImpostor(entry.payload.challenge, Number(n), key);
  if (!challenge) {
    console.error(`✖ Frozen PokéImpostor #${n} cannot be decrypted with this ${GUESS_KEY_ENV}. Wrong key?`);
    process.exit(1);
  }
  challenges.set(Number(n), challenge);
}

let generated = 0, kept = 0, fallbacks = 0, attempts = 0;
const rejections: Record<string, number> = {};
console.log("| # | Date | Level | Category | ✔/✖ | Score | Familiar | Weakest impostor | Status |");
console.log("|---|---|---|---|---|---|---|---|---|");
for (let number = from; number < from + days; number++) {
  if (frozen[String(number)]) {
    kept++;
    continue;
  }
  const result = generateDailyImpostor(number, { data, key, lookup: (n) => challenges.get(n) ?? null });
  const c = result.challenge;
  challenges.set(number, c);
  frozen[String(number)] = {
    number,
    date: dateForChallengeNumber(number),
    payload: {
      challenge: sealImpostor(c, number, key),
      generatorVersion: IMPOSTOR_VERSION,
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
    `| ${formatChallengeNumber(number)} | ${dateForChallengeNumber(number)} | ${impostorLevel(dateForChallengeNumber(number))} | ${getImpostorCategory(c.categoryId)!.short} | ${c.cards.length - c.impostors.length}/${c.impostors.length} | ${a.score.toFixed(2)} | ${a.familiar}/10 | ${a.weakestImpostor.toFixed(2)} | ${result.fallbackStep ? `FALLBACK ${result.fallbackStep}` : "new"} |`,
  );
  if (reveal) {
    const name = (id: number) => data.byId.get(id)!.name;
    console.log(`|   | ✔ ${c.cards.filter((id) => !c.impostors.includes(id)).map(name).join(", ")} · ✖ ${c.impostors.map(name).join(", ")} |`);
  }
}

// ---- Audit of the whole frozen range ------------------------------------------------
const range = [...challenges.entries()].filter(([n]) => n >= from && n < from + days).sort((a, b) => a[0] - b[0]);
const byLevel: Record<string, number[]> = {};
const categories = new Map<string, number[]>();
const familyCount: Record<string, number> = {};
const pokemon = new Map<number, number>();
const boardKeys = new Map<string, number>();
let familiar = 0, repeatedBoards = 0, closeCategory = 0;
for (const [n, c] of range) {
  const level = impostorLevel(dateForChallengeNumber(n));
  const a = analyzeImpostor(c, data, level);
  (byLevel[level] ??= []).push(a.score);
  categories.set(c.categoryId, [...(categories.get(c.categoryId) ?? []), n]);
  const fam = getImpostorCategory(c.categoryId)!.family;
  familyCount[fam] = (familyCount[fam] ?? 0) + 1;
  for (const id of c.cards) pokemon.set(id, (pokemon.get(id) ?? 0) + 1);
  const k = [...c.cards].sort((x, y) => x - y).join(",");
  if (boardKeys.has(k)) repeatedBoards++;
  boardKeys.set(k, n);
  familiar += a.familiar;
}
for (const ns of categories.values()) for (let i = 1; i < ns.length; i++) if (ns[i] - ns[i - 1] < 30) closeCategory++;
const avg = (xs: number[]) => (xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length)).toFixed(2);
console.log(`\nPokéImpostor v${IMPOSTOR_VERSION} · generated ${generated}, kept ${kept}, fallbacks ${fallbacks}, candidate boards ${attempts}`);
console.log(`Audit of #${from}–#${from + days - 1}:`);
console.log(`  categories used: ${categories.size} · reused within 30 days: ${closeCategory} · repeated boards: ${repeatedBoards}`);
for (const [level, scores] of Object.entries(byLevel)) console.log(`  ${level}: ${scores.length} days · score avg ${avg(scores)} (min ${Math.min(...scores)}, max ${Math.max(...scores)})`);
console.log(`  families: ${JSON.stringify(familyCount)}`);
console.log(`  Pokémon used: ${pokemon.size} distinct · most shown: ${Math.max(...pokemon.values())} times · avg familiar ${(familiar / Math.max(1, range.length)).toFixed(1)}/10`);
const total = Object.values(rejections).reduce((s, x) => s + x, 0);
console.log(`  rejected candidates (this run): ${total} · ${Object.entries(rejections).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ")}`);
if (dryRun) {
  console.log("(dry run — nothing written)");
} else {
  writeFileSync(CHALLENGES_FILE, JSON.stringify(file, null, 2) + "\n");
  console.log("✔ Saved to data/daily-challenges.json (boards sealed)");
}
