import { formatChallengeNumber } from "@/lib/daily/calendar";
import { CELL_COUNT, GRID_SIZE } from "@/lib/grid/types";

/** Spoiler-free result text: only shows which cells were filled. */
export function buildShareText(params: {
  challengeNumber: number;
  filled: readonly boolean[];
  streak: number;
  url?: string;
}): string {
  const { challengeNumber, filled, streak, url } = params;
  const rows: string[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    rows.push(
      filled
        .slice(r * GRID_SIZE, r * GRID_SIZE + GRID_SIZE)
        .map((f) => (f ? "🟩" : "⬜"))
        .join(" "),
    );
  }
  const score = filled.filter(Boolean).length;
  return [
    `PokeDaily ${formatChallengeNumber(challengeNumber)}`,
    "",
    ...rows,
    "",
    `${score}/${CELL_COUNT}`,
    ...(streak > 0 ? ["", `🔥 ${streak} day streak`] : []),
    ...(url ? ["", url] : []),
  ].join("\n");
}
