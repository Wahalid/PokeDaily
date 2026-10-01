import { getCondition } from "./conditions/registry";
import { assessGrid, type QualityData, type RuleLevel } from "./quality";
import type { GridDefinition } from "./types";

/**
 * A frozen daily Grid, as stored in data/daily-challenges.json.
 * Internal: the score/answer counts are developer metadata, never sent to players.
 */
export interface FrozenGrid extends GridDefinition {
  generatorVersion: string;
  /** Seed used for the draw (with the recorded history, reproduces the grid). */
  seed: string;
  /** Rule level the grid passed when generated ("balanced" on the normal path). */
  level: RuleLevel;
  /** 0 = normal path; >0 = produced by a fallback step. */
  fallbackStep: number;
  /** Fingerprint of the Pokémon dataset used, for drift detection. */
  dataset: { count: number; hash: string };
  /** Valid-answer count per cell (row-major) at generation time. */
  answerCounts: number[];
  /** Internal difficulty score (see lib/grid/difficulty.ts). */
  score: number;
  /** Candidates drawn before acceptance, and why rejected ones failed. */
  attempts: number;
  rejections: Record<string, number>;
  frozenAt: string;
}

export function hasKnownConditions(definition: GridDefinition): boolean {
  try {
    [...definition.rows, ...definition.columns].forEach(getCondition);
    return definition.rows.length === 3 && definition.columns.length === 3;
  } catch {
    return false;
  }
}

/**
 * Re-checks a frozen grid against the current data and rules.
 * Returns a list of problems (empty = still valid and unchanged).
 */
export function validateFrozenGrid(frozen: FrozenGrid, data: QualityData): string[] {
  if (!hasKnownConditions(frozen)) return ["references an unknown condition"];
  const problems: string[] = [];
  const solvable = assessGrid(frozen, data, undefined, "solvable");
  if (solvable.rejection) problems.push(`no longer solvable (${solvable.rejection})`);
  const counts = solvable.evaluation.cells.map((c) => c.answers.length);
  if (counts.join(",") !== frozen.answerCounts.join(",")) {
    problems.push(`answer counts drifted: stored [${frozen.answerCounts}] now [${counts}]`);
  }
  const full = assessGrid(frozen, data, undefined, frozen.level);
  if (!solvable.rejection && full.rejection) problems.push(`fails "${frozen.level}" rules now (${full.rejection})`);
  return problems;
}
