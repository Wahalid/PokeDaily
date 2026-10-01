/**
 * Generates daily Grids with the current generator and freezes them into
 * data/daily-challenges.json (the app serves frozen grids first).
 *
 *   npm run grid:freeze                         # #1–#60, skips already-frozen days
 *   npm run grid:freeze -- --from 61 --days 30  # extend the runway
 *   npm run grid:freeze -- --force              # regenerate even frozen days (rewrites history!)
 *   npm run grid:freeze -- --dry-run            # print the audit table only
 *
 * Days are generated in order so the recency rule can see previous days
 * (both already-frozen ones and ones generated in this run).
 */
import { writeFileSync } from "node:fs";
import type { StoredChallenge } from "../lib/daily/challenge-store";
import { dateForChallengeNumber, formatChallengeNumber } from "../lib/daily/calendar";
import { getAllConditions, getCondition } from "../lib/grid/conditions/registry";
import { dailyGridSeed, generateDailyGrid, recentDaysBefore } from "../lib/grid/daily";
import { scoreGrid } from "../lib/grid/difficulty";
import type { FrozenGrid } from "../lib/grid/frozen";
import { GENERATOR_VERSION } from "../lib/grid/generator";
import { prepareQualityData } from "../lib/grid/quality";
import type { GridDefinition } from "../lib/grid/types";
import { CHALLENGES_FILE, datasetFingerprint, loadChallengeFile, loadPokedex } from "./lib/load-data";

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

const from = arg("from", 1);
const days = arg("days", 60);
const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");

const pokedex = loadPokedex();
const dataset = datasetFingerprint();
const data = prepareQualityData(getAllConditions(), pokedex.all);
const file = loadChallengeFile();
const frozen = (file.grid ??= {}) as Record<string, StoredChallenge<FrozenGrid>>;

const lookup = (n: number): GridDefinition | null => frozen[String(n)]?.payload ?? null;
const label = (id: string) => getCondition(id).label;
const totals: Record<string, number> = {};
let generated = 0, kept = 0, fallbacks = 0, totalAttempts = 0;
const rows: string[] = [];

for (let number = from; number < from + days; number++) {
  const existing = frozen[String(number)];
  if (existing && !force) {
    kept++;
    rows.push(tableRow(number, existing.payload, "kept"));
    continue;
  }
  const result = generateDailyGrid(number, { pokemon: pokedex.all, recentDays: recentDaysBefore(number, lookup), qualityData: data });
  const answerCounts = result.report.evaluation.cells.map((c) => c.answers.length);
  const record: FrozenGrid = {
    rows: result.definition.rows,
    columns: result.definition.columns,
    generatorVersion: GENERATOR_VERSION,
    seed: dailyGridSeed(number),
    level: result.level,
    fallbackStep: result.fallbackStep,
    dataset,
    answerCounts,
    score: Number(scoreGrid(answerCounts).score.toFixed(3)),
    attempts: result.attempts + result.failedSteps.reduce((s, f) => s + f.attempts, 0),
    rejections: result.rejections,
    frozenAt: new Date().toISOString(),
  };
  frozen[String(number)] = { number, date: dateForChallengeNumber(number), payload: record };
  generated++;
  totalAttempts += record.attempts;
  if (result.fallbackStep > 0) fallbacks++;
  for (const [reason, count] of Object.entries(record.rejections)) totals[reason] = (totals[reason] ?? 0) + count;
  rows.push(tableRow(number, record, result.fallbackStep > 0 ? `FALLBACK ${result.fallbackStep}` : "new"));
}

function tableRow(number: number, g: FrozenGrid, status: string): string {
  const counts = [0, 1, 2].map((r) => g.answerCounts.slice(r * 3, r * 3 + 3).join("/")).join("  ");
  return `| ${formatChallengeNumber(number)} | ${dateForChallengeNumber(number)} | ${g.rows.map(label).join(", ")} | ${g.columns.map(label).join(", ")} | ${counts} | ${g.score.toFixed(2)} | ${g.attempts} | ${status} |`;
}

console.log("| # | Date | Rows | Columns | Answers (row1  row2  row3) | Score | Candidates | Status |");
console.log("|---|---|---|---|---|---|---|---|");
rows.forEach((r) => console.log(r));
console.log(`\nGenerator v${GENERATOR_VERSION} · dataset ${dataset.count} Pokémon (${dataset.hash})`);
console.log(`Generated ${generated}, kept ${kept} already-frozen, fallbacks ${fallbacks}, candidates drawn ${totalAttempts}`);
const rejected = Object.values(totals).reduce((a, b) => a + b, 0);
console.log(`Rejected candidates: ${rejected} — ${Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`);

if (dryRun) {
  console.log("\n(dry run — nothing written)");
} else {
  writeFileSync(CHALLENGES_FILE, JSON.stringify(file, null, 2) + "\n");
  console.log(`\n✔ Saved to data/daily-challenges.json`);
}
