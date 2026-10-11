import { formatChallengeNumber } from "@/lib/daily/calendar";
import { TOP_SIZE } from "@/lib/top10/types";

/**
 * Spoiler-free result: the visible criterion (shared by everyone), which
 * positions were found (🟩) or not (⬜), the score and how it ended
 * (completed / given up). Never names, Pokédex numbers or values.
 */
export function buildTop10ShareText(params: {
  challengeNumber: number;
  criterionShort: string;
  foundPositions: readonly number[];
  gaveUp: boolean;
}): string {
  const { challengeNumber, criterionShort, foundPositions, gaveUp } = params;
  const found = new Set(foundPositions);
  const tiles = Array.from({ length: TOP_SIZE }, (_, i) => (found.has(i + 1) ? "🟩" : "⬜"));
  return [
    `🔟 PokeDaily Top 10 ${formatChallengeNumber(challengeNumber)}`,
    criterionShort,
    "",
    tiles.slice(0, 5).join(" "),
    tiles.slice(5).join(" "),
    "",
    `${found.size}/${TOP_SIZE} · ${gaveUp ? "🏳️ Abandonado" : "🏆 Completado"}`,
  ].join("\n");
}
