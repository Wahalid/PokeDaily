/**
 * Internal Grid difficulty model (developer-only — never shown to players).
 *
 * Cells are tiered by how many valid answers they have; the grid score is
 * the mean of the cell tier points. Higher = harder.
 */

export type CellTier = "invalid" | "very-hard" | "hard" | "normal" | "easy" | "very-easy";

export const TIER_POINTS: Record<CellTier, number> = {
  invalid: 5,
  "very-hard": 4,
  hard: 3,
  normal: 2,
  easy: 1,
  "very-easy": 0,
};

export function cellTier(answerCount: number): CellTier {
  if (answerCount <= 1) return "invalid";
  if (answerCount <= 3) return "very-hard";
  if (answerCount <= 8) return "hard";
  if (answerCount <= 20) return "normal";
  if (answerCount <= 40) return "easy";
  return "very-easy";
}

export interface GridDifficulty {
  /** Mean tier points over the 9 cells (0 = trivial … 5 = impossible). */
  score: number;
  cellTiers: CellTier[];
  tierCounts: Record<CellTier, number>;
}

export function scoreGrid(answerCounts: readonly number[]): GridDifficulty {
  const cellTiers = answerCounts.map(cellTier);
  const tierCounts: Record<CellTier, number> = { invalid: 0, "very-hard": 0, hard: 0, normal: 0, easy: 0, "very-easy": 0 };
  for (const tier of cellTiers) tierCounts[tier]++;
  const score = cellTiers.reduce((sum, tier) => sum + TIER_POINTS[tier], 0) / Math.max(1, cellTiers.length);
  return { score, cellTiers, tierCounts };
}
