import { formatChallengeNumber } from "@/lib/daily/calendar";
import { MAX_LIVES, TOP_SIZE } from "@/lib/top10/types";

/**
 * Spoiler-free result: the visible criterion (shared by everyone), which
 * positions were found (🟩) or not (⬜), lives left and score. Never names,
 * Pokédex numbers or values.
 */
export function buildTop10ShareText(params: {
  challengeNumber: number;
  criterionShort: string;
  foundPositions: readonly number[];
  lives: number;
}): string {
  const { challengeNumber, criterionShort, foundPositions, lives } = params;
  const found = new Set(foundPositions);
  const tiles = Array.from({ length: TOP_SIZE }, (_, i) => (found.has(i + 1) ? "🟩" : "⬜"));
  const hearts = "❤️".repeat(Math.max(0, lives)) + "❌".repeat(MAX_LIVES - Math.max(0, lives));
  return [
    `🔟 PokeDaily Top 10 ${formatChallengeNumber(challengeNumber)}`,
    criterionShort,
    "",
    tiles.slice(0, 5).join(" "),
    tiles.slice(5).join(" "),
    "",
    hearts,
    `${found.size}/${TOP_SIZE}`,
  ].join("\n");
}
