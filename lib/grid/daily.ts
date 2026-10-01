import type { ChallengeStore } from "@/lib/daily/challenge-store";
import { dateForChallengeNumber, type DateKey } from "@/lib/daily/calendar";
import type { Pokemon } from "@/lib/pokemon/types";
import { hasKnownConditions, type FrozenGrid } from "./frozen";
import {
  DEFAULT_RECENCY,
  GENERATOR_VERSION,
  generateGridSafe,
  gridConditionIds,
  SAFE_GRID,
  type SafeGeneratedGrid,
} from "./generator";
import type { QualityData } from "./quality";
import type { GridDefinition } from "./types";

export interface DailyGrid {
  number: number;
  date: DateKey;
  definition: GridDefinition;
  /**
   * frozen    — served from data/daily-challenges.json (the normal case)
   * generated — not frozen yet; generated on the fly with the current generator
   * fallback  — generation had to relax rules or use the safe grid
   */
  source: "frozen" | "generated" | "fallback";
}

export function dailyGridSeed(number: number, version: string = GENERATOR_VERSION): string {
  return `pokedaily:grid:v${version}:${number}`;
}

/** Condition ids of the `window` days before `number`, most recent first. */
export function recentDaysBefore(
  number: number,
  lookup: (n: number) => GridDefinition | null,
  window: number = Math.max(DEFAULT_RECENCY.softDays, DEFAULT_RECENCY.similarityDays),
): string[][] {
  const days: string[][] = [];
  for (let n = number - 1; n >= Math.max(1, number - window); n--) {
    const grid = lookup(n);
    days.push(grid ? gridConditionIds(grid) : []);
  }
  return days;
}

/** Generates the grid for a challenge number, given the previous days. Never throws. */
export function generateDailyGrid(
  number: number,
  deps: { pokemon: readonly Pokemon[]; recentDays: string[][]; qualityData?: QualityData },
): SafeGeneratedGrid {
  return generateGridSafe({
    seed: dailyGridSeed(number),
    pokemon: deps.pokemon,
    recentDays: deps.recentDays,
    qualityData: deps.qualityData,
  });
}

/**
 * Resolves the Grid for a challenge number. Never throws.
 *   1. a frozen grid (with known conditions) always wins;
 *   2. otherwise generate on the fly, using frozen previous days for recency;
 *   3. if anything goes wrong, serve SAFE_GRID.
 */
export function resolveDailyGrid(
  number: number,
  deps: { pokemon: readonly Pokemon[]; store: ChallengeStore; onWarning?: (message: string) => void },
): DailyGrid {
  const date = dateForChallengeNumber(number);
  const warn = deps.onWarning ?? (() => {});
  const frozenAt = (n: number) => {
    const stored = deps.store.get<FrozenGrid>("grid", n);
    return stored && hasKnownConditions(stored.payload) ? stored.payload : null;
  };

  try {
    const stored = deps.store.get<FrozenGrid>("grid", number);
    if (stored) {
      if (hasKnownConditions(stored.payload)) {
        return { number, date: stored.date, definition: pick(stored.payload), source: "frozen" };
      }
      warn(`Frozen grid #${number} references unknown conditions; generating instead.`);
    } else {
      warn(`Grid #${number} is not frozen; generating on the fly. Run \`npm run grid:freeze\`.`);
    }

    const generated = generateDailyGrid(number, { pokemon: deps.pokemon, recentDays: recentDaysBefore(number, frozenAt) });
    if (generated.fallbackStep > 0) warn(`Grid #${number} used fallback step ${generated.fallbackStep}.`);
    return {
      number,
      date,
      definition: generated.definition,
      source: generated.fallbackStep > 0 ? "fallback" : "generated",
    };
  } catch (error) {
    warn(`Grid #${number} resolution failed (${String(error)}); serving SAFE_GRID.`);
    return { number, date, definition: SAFE_GRID, source: "fallback" };
  }
}

const pick = ({ rows, columns }: GridDefinition): GridDefinition => ({ rows, columns });
