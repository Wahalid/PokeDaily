import { CELL_COUNT } from "@/lib/bingo/types";
import { formatChallengeNumber } from "@/lib/daily/calendar";

/** Spoiler-free result: which cells were filled — no Pokémon, no conditions. */
export function buildBingoShareText(params: {
  challengeNumber: number;
  filled: readonly boolean[];
  won: boolean;
}): string {
  const { challengeNumber, filled, won } = params;
  const rows = [0, 1, 2, 3].map((r) => filled.slice(r * 4, r * 4 + 4).map((f) => (f ? "🟩" : "⬛")).join(""));
  const count = filled.filter(Boolean).length;
  return [
    `🎯 PokeBingo ${formatChallengeNumber(challengeNumber)}`,
    "",
    ...rows,
    "",
    `${count}/${CELL_COUNT} · ${won ? "¡BINGO!" : "Terminado"}`,
  ].join("\n");
}
