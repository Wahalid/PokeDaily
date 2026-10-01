/**
 * Read-only preview of daily Grids exactly as the app would serve them
 * (frozen grids first, otherwise generated). To freeze grids use `npm run grid:freeze`.
 *
 *   npm run grid:preview                       # today + next 6 days
 *   npm run grid:preview -- --from 1 --days 30
 */
import { createJsonChallengeStore } from "../lib/daily/challenge-store";
import { currentChallengeNumber, formatChallengeNumber } from "../lib/daily/calendar";
import { getCondition } from "../lib/grid/conditions/registry";
import { resolveDailyGrid } from "../lib/grid/daily";
import { scoreGrid } from "../lib/grid/difficulty";
import { evaluateGrid } from "../lib/grid/engine";
import { loadChallengeFile, loadPokedex } from "./lib/load-data";

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

const from = arg("from", currentChallengeNumber());
const days = arg("days", 7);

const pokedex = loadPokedex();
const store = createJsonChallengeStore(loadChallengeFile());

for (let number = from; number < from + days; number++) {
  const grid = resolveDailyGrid(number, { pokemon: pokedex.all, store, onWarning: (m) => console.warn(`  ⚠ ${m}`) });
  const evaluation = evaluateGrid(grid.definition, pokedex.all);
  const counts = evaluation.cells.map((c) => c.answers.length);
  const label = (id: string) => getCondition(id).label;

  console.log(`\n${formatChallengeNumber(number)}  ${grid.date}  (${grid.source}, score ${scoreGrid(counts).score.toFixed(2)})`);
  console.log(`${"".padEnd(16)}${grid.definition.columns.map((c) => label(c).padEnd(16)).join("")}`);
  grid.definition.rows.forEach((rowId, r) => {
    const cells = counts.slice(r * 3, r * 3 + 3).map((n) => `${n} answers`.padEnd(16));
    console.log(`${label(rowId).padEnd(16)}${cells.join("")}`);
  });
}
