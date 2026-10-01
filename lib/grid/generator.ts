import type { Pokemon } from "@/lib/pokemon/types";
import { createRng, pickWeighted, type Rng } from "@/lib/random";
import { getAllConditions, getCategory, getCondition } from "./conditions/registry";
import type { GridCondition } from "./conditions/types";
import {
  assessGrid,
  DEFAULT_QUALITY,
  isBroadCondition,
  isKnowledgeHeavyCondition,
  isViableCell,
  pairStats,
  prepareQualityData,
  type QualityConfig,
  type QualityData,
  type QualityReport,
  type RuleLevel,
} from "./quality";
import { GRID_SIZE, type GridDefinition } from "./types";

/**
 * Bump whenever drawing, weights, rules or the condition catalogue change in
 * a way that alters output. Frozen grids record the version that made them.
 */
export const GENERATOR_VERSION = "2.0.0";

export interface RecencyConfig {
  /** Conditions used within this many previous days are excluded outright. */
  strictDays: number;
  /** Conditions used within this many previous days keep only `softMultiplier` of their weight. */
  suppressDays: number;
  softMultiplier: number;
  /**
   * After the suppressed window, weight ramps linearly back to full at
   * `softDays` days since last use. (A gradual recovery avoids the periodic
   * cycles a hard cut-off creates.)
   */
  softDays: number;
  /** Reject grids sharing more than `maxSharedConditions` with any grid of the last `similarityDays`. */
  similarityDays: number;
  maxSharedConditions: number;
}

/**
 * Tuned on the real data over 365 sequential days:
 * - a strict 7-day exclusion is infeasible (48 conditions × 6 per day; ~50% of days fell back);
 * - so: exclude the last 3 days, keep 5% weight for days 4–7, full weight from day 8;
 * - and reject any grid sharing 4+ conditions with a grid of the last 30 days
 *   (without this guard the 7-day cut-off produced repeating 8-day cycles).
 * Result: 0 fallbacks, 0 repeats within 3 days, ~2.5 repeated conditions per
 * grid within 7 days (mostly Types), never >3 shared with any grid in 30 days.
 */
export const DEFAULT_RECENCY: RecencyConfig = {
  strictDays: 3,
  suppressDays: 7,
  softMultiplier: 0.05,
  softDays: 8,
  similarityDays: 30,
  maxSharedConditions: 3,
};

export interface GeneratorOptions {
  /** Same seed + same data + same history ⇒ same grid. */
  seed: string;
  pokemon: readonly Pokemon[];
  /** Pool of conditions to draw from (defaults to the full catalogue). */
  conditions?: readonly GridCondition[];
  quality?: QualityConfig;
  /** Strictest rule level a candidate must pass. */
  level?: RuleLevel;
  /** Condition ids of previous days, most recent first (index 0 = yesterday). */
  recentDays?: ReadonlyArray<readonly string[]>;
  recency?: RecencyConfig;
  maxAttempts?: number;
  /** Reuse precomputed data across many generations (optional optimisation). */
  qualityData?: QualityData;
}

export interface GenerationStats {
  attempts: number;
  /** Rejection reason → number of rejected candidates. */
  rejections: Record<string, number>;
}

export interface GeneratedGrid extends GenerationStats {
  definition: GridDefinition;
  report: QualityReport;
  level: RuleLevel;
}

export class GridGenerationError extends Error {
  constructor(
    message: string,
    readonly stats: GenerationStats,
  ) {
    super(message);
  }
}

/**
 * Generates one 3×3 grid by rejection sampling:
 *   1. draw 3 row + 3 column conditions (weighted by category, damped by recency),
 *   2. evaluate all 9 intersections,
 *   3. run the quality rules up to `level` (see lib/grid/quality.ts),
 *   4. accept the first candidate that passes.
 * Throws GridGenerationError if nothing passes within `maxAttempts`.
 */
export function generateGrid(options: GeneratorOptions): GeneratedGrid {
  const {
    seed,
    pokemon,
    conditions = getAllConditions(),
    quality = DEFAULT_QUALITY,
    level = "balanced",
    recentDays = [],
    recency = DEFAULT_RECENCY,
    maxAttempts = 5000,
  } = options;
  const data = options.qualityData ?? prepareQualityData(conditions, pokemon, quality);
  const weights = conditionWeights(conditions, recentDays, recency);
  const constraints = drawConstraints(data, quality, level);
  const rng = createRng(seed);
  const rejections: Record<string, number> = {};

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const definition = drawDefinition(rng, conditions, weights, constraints);
    if (!definition) {
      rejections["draw-failed"] = (rejections["draw-failed"] ?? 0) + 1;
      continue;
    }
    if (level !== "solvable" && tooSimilarToRecent(definition, recentDays, recency)) {
      rejections["too-similar-to-recent-grid"] = (rejections["too-similar-to-recent-grid"] ?? 0) + 1;
      continue;
    }
    const report = assessGrid(definition, data, quality, level);
    if (!report.rejection) return { definition, report, level, attempts: attempt, rejections };
    rejections[report.rejection] = (rejections[report.rejection] ?? 0) + 1;
  }
  throw new GridGenerationError(`No grid passed "${level}" rules for seed "${seed}" in ${maxAttempts} attempts`, {
    attempts: maxAttempts,
    rejections,
  });
}

export interface SafeGeneratedGrid extends GeneratedGrid {
  /** Which step of the fallback ladder produced the grid (0 = normal path). */
  fallbackStep: number;
  /** Stats of every failed step before the successful one. */
  failedSteps: GenerationStats[];
}

/**
 * Hand-checked last resort: Gen I–III × Fire/Water/Grass is always solvable.
 * (Verified by `npm run verify`.)
 */
export const SAFE_GRID: GridDefinition = {
  rows: ["gen:1", "gen:2", "gen:3"],
  columns: ["type:fire", "type:water", "type:grass"],
};

/**
 * Like generateGrid, but never throws. Relaxes progressively:
 *   0. balanced rules + full recency     (normal path)
 *   1. balanced rules + soft recency only
 *   2. fair rules     + soft recency only
 *   3. solvable rules, no recency
 *   4. SAFE_GRID
 */
export function generateGridSafe(options: GeneratorOptions): SafeGeneratedGrid {
  const recency = options.recency ?? DEFAULT_RECENCY;
  const softOnly = { ...recency, strictDays: 0 };
  const ladder: Array<Partial<GeneratorOptions>> = [
    {},
    { recency: softOnly, seed: `${options.seed}:soft` },
    { recency: softOnly, level: "fair", seed: `${options.seed}:fair` },
    { recentDays: [], level: "solvable", seed: `${options.seed}:solvable` },
  ];
  const failedSteps: GenerationStats[] = [];

  for (let step = 0; step < ladder.length; step++) {
    try {
      const result = generateGrid({ ...options, ...ladder[step] });
      return { ...result, fallbackStep: step, failedSteps };
    } catch (error) {
      failedSteps.push(error instanceof GridGenerationError ? error.stats : { attempts: 0, rejections: { error: 1 } });
    }
  }

  const pokemon = options.pokemon;
  const data = options.qualityData ?? prepareQualityData(options.conditions ?? getAllConditions(), pokemon);
  const report = assessGrid(SAFE_GRID, data, options.quality, "solvable");
  return { definition: SAFE_GRID, report, level: "solvable", attempts: 0, rejections: {}, fallbackStep: ladder.length, failedSteps };
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/**
 * Per-condition draw weight = category weight spread over the category's
 * conditions, multiplied by a recency factor (0 inside the strict window).
 */
function conditionWeights(
  conditions: readonly GridCondition[],
  recentDays: ReadonlyArray<readonly string[]>,
  recency: RecencyConfig,
): Map<string, number> {
  const daysSinceUse = new Map<string, number>();
  recentDays.forEach((ids, index) => {
    for (const id of ids) if (!daysSinceUse.has(id)) daysSinceUse.set(id, index + 1);
  });
  const categorySize = new Map<string, number>();
  for (const c of conditions) categorySize.set(c.category, (categorySize.get(c.category) ?? 0) + 1);

  return new Map(
    conditions.map((c) => {
      const base = getCategory(c.category).weight / categorySize.get(c.category)!;
      return [c.id, base * recencyFactor(daysSinceUse.get(c.id), recency)];
    }),
  );
}

/** 0 (strict) → softMultiplier (suppressed) → linear recovery to 1 at softDays. */
export function recencyFactor(daysSinceUse: number | undefined, recency: RecencyConfig): number {
  if (daysSinceUse === undefined || daysSinceUse >= recency.softDays) return 1;
  if (daysSinceUse <= recency.strictDays) return 0;
  if (daysSinceUse <= recency.suppressDays) return recency.softMultiplier;
  const progress = (daysSinceUse - recency.suppressDays) / Math.max(1, recency.softDays - recency.suppressDays);
  return recency.softMultiplier + (1 - recency.softMultiplier) * progress;
}

/** True if the candidate shares too many conditions with any grid in the similarity window. */
function tooSimilarToRecent(
  definition: GridDefinition,
  recentDays: ReadonlyArray<readonly string[]>,
  recency: RecencyConfig,
): boolean {
  const ids = [...definition.rows, ...definition.columns];
  return recentDays
    .slice(0, recency.similarityDays)
    .some((day) => ids.filter((id) => day.includes(id)).length > recency.maxSharedConditions);
}

type CanAdd = (selected: readonly GridCondition[], candidate: GridCondition) => boolean;
interface DrawConstraints {
  canAdd: CanAdd;
  cellOk: (row: GridCondition, column: GridCondition) => boolean;
}

/**
 * Condition-level limits enforced while drawing, so candidates that would
 * certainly be rejected (too many broad or stats/size conditions) are never built.
 * The quality rules still re-check them.
 */
function drawConstraints(data: QualityData, quality: QualityConfig, level: RuleLevel): DrawConstraints {
  const strict = level !== "solvable";
  const broad = (c: GridCondition) => isBroadCondition(c.id, data, quality);
  const heavy = (c: GridCondition) => isKnowledgeHeavyCondition(c.id);
  return {
    canAdd: (selected, candidate) =>
      !strict ||
      ((!broad(candidate) || selected.filter(broad).length < quality.maxBroadConditions) &&
        (!heavy(candidate) || selected.filter(heavy).length < quality.maxKnowledgeHeavyConditions)),
    // Column candidates must form a viable cell with every row already drawn.
    cellOk: (row, column) =>
      strict
        ? isViableCell(row.id, column.id, data, quality)
        : pairStats(row.id, column.id, data).answers >= Math.max(1, quality.minAnswersPerCell),
  };
}

function drawDefinition(
  rng: Rng,
  pool: readonly GridCondition[],
  weights: ReadonlyMap<string, number>,
  constraints: DrawConstraints,
): GridDefinition | null {
  const { canAdd, cellOk } = constraints;
  const rows = drawAxis(rng, pool, weights, [], canAdd);
  if (!rows) return null;

  const rowCategories = new Set(rows.map((c) => c.category));
  const columnPool = pool.filter(
    (c) =>
      !rows.includes(c) &&
      (getCategory(c.category).allowOnBothAxes || !rowCategories.has(c.category)) &&
      rows.every((row) => cellOk(row, c)),
  );
  const columns = drawAxis(rng, columnPool, weights, rows, canAdd);
  if (!columns) return null;

  return { rows: rows.map((c) => c.id), columns: columns.map((c) => c.id) };
}

function drawAxis(
  rng: Rng,
  pool: readonly GridCondition[],
  weights: ReadonlyMap<string, number>,
  taken: readonly GridCondition[],
  canAdd: CanAdd,
): GridCondition[] | null {
  const picked: GridCondition[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    const selected = [...taken, ...picked];
    const available = pool.filter(
      (c) => !selected.includes(c) && (weights.get(c.id) ?? 0) > 0 && canAdd(selected, c),
    );
    if (available.length === 0) return null;
    picked.push(pickWeighted(rng, available, (c) => weights.get(c.id)!));
  }
  return picked;
}

/** Condition ids appearing in a grid (helper for recency bookkeeping). */
export function gridConditionIds(definition: GridDefinition): string[] {
  return [...definition.rows, ...definition.columns].filter((id) => {
    try {
      return Boolean(getCondition(id));
    } catch {
      return false;
    }
  });
}
