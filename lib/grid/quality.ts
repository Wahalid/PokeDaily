import type { Pokemon } from "@/lib/pokemon/types";
import { getCategory, getCondition } from "./conditions/registry";
import type { GridCondition } from "./conditions/types";
import { scoreGrid, type GridDifficulty } from "./difficulty";
import { evaluateGrid, hasDistinctSolution } from "./engine";
import type { GridDefinition, GridEvaluation } from "./types";

/**
 * Grid quality rules (internal, developer-only).
 *
 * Rules are grouped in levels so the generator can relax them step by step
 * in its fallback path instead of failing:
 *   solvable  — the grid can be completed at all
 *   fair      — no trivial/degenerate or expert-only cells
 *   balanced  — a reasonable mix of difficulties across the whole board
 */
export type RuleLevel = "solvable" | "fair" | "balanced";

export interface QualityConfig {
  minAnswersPerCell: number;
  /** A condition matching more than this share of the Pokédex is "broad". */
  broadThreshold: number;
  maxBroadConditions: number;
  /** answers / (smaller condition's pool) at or above this = one condition ~implies the other. */
  maxContainment: number;
  /** Generations considered "familiar" for the recognisability rule. */
  familiarMaxGeneration: number;
  minFamiliarAnswersPerCell: number;
  maxKnowledgeHeavyConditions: number;
  maxVeryHardCells: number;
  maxVeryEasyCells: number;
  minNormalOrEasyCells: number;
  scoreRange: [number, number];
}

export const DEFAULT_QUALITY: QualityConfig = {
  minAnswersPerCell: 3,
  broadThreshold: 0.25,
  maxBroadConditions: 1,
  maxContainment: 0.8,
  familiarMaxGeneration: 7,
  minFamiliarAnswersPerCell: 2,
  maxKnowledgeHeavyConditions: 1,
  maxVeryHardCells: 1,
  maxVeryEasyCells: 1,
  minNormalOrEasyCells: 3,
  scoreRange: [1.7, 2.4],
};

/** Precomputed facts about the Pokédex shared by every candidate check. */
export interface QualityData {
  pokemon: readonly Pokemon[];
  /** conditionId → ids of matching Pokémon (Pokédex order) + set, for fast intersection. */
  matches: ReadonlyMap<string, { ids: readonly number[]; set: ReadonlySet<number> }>;
  /** conditionId → number of Pokémon matching it. */
  poolSize: ReadonlyMap<string, number>;
  /** Ids of Pokémon from familiar generations. */
  familiarIds: ReadonlySet<number>;
}

export function prepareQualityData(
  conditions: readonly GridCondition[],
  pokemon: readonly Pokemon[],
  config: QualityConfig = DEFAULT_QUALITY,
): QualityData {
  const matches = new Map(
    conditions.map((c) => {
      const ids = pokemon.filter(c.test).map((p) => p.id);
      return [c.id, { ids, set: new Set(ids) }] as const;
    }),
  );
  return {
    pokemon,
    matches,
    poolSize: new Map([...matches].map(([id, m]) => [id, m.ids.length])),
    familiarIds: new Set(pokemon.filter((p) => p.generation <= config.familiarMaxGeneration).map((p) => p.id)),
  };
}

/**
 * Same result as engine.evaluateGrid, but by intersecting precomputed match
 * lists (much faster when checking thousands of candidates).
 */
function evaluateFast(definition: GridDefinition, data: QualityData): GridEvaluation {
  const known = [...definition.rows, ...definition.columns].every((id) => data.matches.has(id));
  if (!known) return evaluateGrid(definition, data.pokemon);
  const cells = [];
  for (let index = 0; index < 9; index++) {
    const rowId = definition.rows[Math.floor(index / 3)];
    const columnId = definition.columns[index % 3];
    const column = data.matches.get(columnId)!.set;
    const answers = data.matches.get(rowId)!.ids.filter((id) => column.has(id));
    cells.push({ index, rowId, columnId, answers });
  }
  return { definition, cells };
}

interface RuleContext {
  evaluation: GridEvaluation;
  difficulty: GridDifficulty;
  data: QualityData;
  config: QualityConfig;
}

type Rule = { name: string; level: RuleLevel; check: (ctx: RuleContext) => boolean };

const poolOf = (data: QualityData, id: string) => data.poolSize.get(id) ?? data.pokemon.filter(getCondition(id).test).length;
const conditionIds = (e: GridEvaluation) => [...e.definition.rows, ...e.definition.columns];

const pairCache = new WeakMap<QualityData, Map<string, { answers: number; familiar: number }>>();

/** Answer / familiar-answer counts for a row × column pair (memoised per QualityData). */
export function pairStats(rowId: string, columnId: string, data: QualityData): { answers: number; familiar: number } {
  let cache = pairCache.get(data);
  if (!cache) pairCache.set(data, (cache = new Map()));
  const key = rowId < columnId ? `${rowId}|${columnId}` : `${columnId}|${rowId}`;
  let stats = cache.get(key);
  if (!stats) {
    const a = data.matches.get(rowId), b = data.matches.get(columnId);
    const answers = a && b ? a.ids.filter((id) => b.set.has(id)) : [];
    stats = { answers: answers.length, familiar: answers.filter((id) => data.familiarIds.has(id)).length };
    cache.set(key, stats);
  }
  return stats;
}

/**
 * Whether a single cell (row × column) can satisfy every per-cell rule:
 * enough answers, enough familiar answers, and not degenerate.
 * The generator uses this while drawing columns; the rules re-check it.
 */
export function isViableCell(rowId: string, columnId: string, data: QualityData, config: QualityConfig = DEFAULT_QUALITY): boolean {
  const { answers, familiar } = pairStats(rowId, columnId, data);
  return (
    answers >= Math.max(1, config.minAnswersPerCell) &&
    familiar >= config.minFamiliarAnswersPerCell &&
    answers / Math.min(poolOf(data, rowId), poolOf(data, columnId)) < config.maxContainment
  );
}

/** Condition-level facts the generator also enforces while drawing (cheaper than rejecting later). */
export function isBroadCondition(id: string, data: QualityData, config: QualityConfig = DEFAULT_QUALITY): boolean {
  return poolOf(data, id) / data.pokemon.length > config.broadThreshold;
}

export function isKnowledgeHeavyCondition(id: string): boolean {
  return Boolean(getCategory(getCondition(id).category).knowledgeHeavy);
}

/** Each rule returns true when the grid PASSES it. Order = order of rejection reasons. */
export const QUALITY_RULES: readonly Rule[] = [
  // --- solvable ---
  {
    name: "cell-with-too-few-answers",
    level: "solvable",
    check: ({ evaluation, config }) => evaluation.cells.every((c) => c.answers.length >= Math.max(1, config.minAnswersPerCell)),
  },
  {
    name: "no-distinct-solution",
    level: "solvable",
    check: ({ evaluation }) => hasDistinctSolution(evaluation.cells.map((c) => c.answers)),
  },
  // --- fair ---
  {
    name: "too-many-broad-conditions",
    level: "fair",
    check: ({ evaluation, data, config }) =>
      conditionIds(evaluation).filter((id) => isBroadCondition(id, data, config)).length <= config.maxBroadConditions,
  },
  {
    name: "degenerate-cell",
    level: "fair",
    check: ({ evaluation, data, config }) =>
      evaluation.cells.every(
        (c) => c.answers.length / Math.min(poolOf(data, c.rowId), poolOf(data, c.columnId)) < config.maxContainment,
      ),
  },
  {
    name: "too-few-familiar-answers",
    level: "fair",
    check: ({ evaluation, data, config }) =>
      evaluation.cells.every((c) => c.answers.filter((id) => data.familiarIds.has(id)).length >= config.minFamiliarAnswersPerCell),
  },
  {
    name: "too-many-knowledge-heavy-conditions",
    level: "fair",
    check: ({ evaluation, config }) =>
      conditionIds(evaluation).filter(isKnowledgeHeavyCondition).length <= config.maxKnowledgeHeavyConditions,
  },
  // --- balanced ---
  {
    name: "too-many-very-hard-cells",
    level: "balanced",
    check: ({ difficulty, config }) => difficulty.tierCounts["very-hard"] <= config.maxVeryHardCells,
  },
  {
    name: "too-many-very-easy-cells",
    level: "balanced",
    check: ({ difficulty, config }) => difficulty.tierCounts["very-easy"] <= config.maxVeryEasyCells,
  },
  {
    name: "too-few-normal-or-easy-cells",
    level: "balanced",
    check: ({ difficulty, config }) => difficulty.tierCounts.normal + difficulty.tierCounts.easy >= config.minNormalOrEasyCells,
  },
  {
    name: "score-out-of-range",
    level: "balanced",
    check: ({ difficulty, config }) => difficulty.score >= config.scoreRange[0] && difficulty.score <= config.scoreRange[1],
  },
];

const LEVEL_ORDER: Record<RuleLevel, number> = { solvable: 0, fair: 1, balanced: 2 };

export interface QualityReport {
  /** First failing rule, or null if the grid passes every rule up to `level`. */
  rejection: string | null;
  evaluation: GridEvaluation;
  difficulty: GridDifficulty;
}

/** Checks a candidate against all rules up to (and including) `level`. */
export function assessGrid(
  definition: GridDefinition,
  data: QualityData,
  config: QualityConfig = DEFAULT_QUALITY,
  level: RuleLevel = "balanced",
): QualityReport {
  const evaluation = evaluateFast(definition, data);
  const difficulty = scoreGrid(evaluation.cells.map((c) => c.answers.length));
  const ctx: RuleContext = { evaluation, difficulty, data, config };
  const failed = QUALITY_RULES.find((rule) => LEVEL_ORDER[rule.level] <= LEVEL_ORDER[level] && !rule.check(ctx));
  return { rejection: failed?.name ?? null, evaluation, difficulty };
}
