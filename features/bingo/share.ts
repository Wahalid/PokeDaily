import { CELL_COUNT, MAX_LIVES } from "@/lib/bingo/types";
import { formatChallengeNumber } from "@/lib/daily/calendar";

/** Spoiler-free result: which cells were filled, lives left — no Pokémon, no conditions. */
export function buildBingoShareText(params: {
  challengeNumber: number;
  filled: readonly boolean[];
  lives: number;
  won: boolean;
}): string {
  const { challengeNumber, filled, lives, won } = params;
  const rows = [0, 1, 2, 3].map((r) => filled.slice(r * 4, r * 4 + 4).map((f) => (f ? "🟩" : "⬛")).join(""));
  const hearts = "❤️".repeat(Math.max(0, lives)) + "❌".repeat(MAX_LIVES - Math.max(0, lives));
  const count = filled.filter(Boolean).length;
  return [
    `🎯 PokeBingo ${formatChallengeNumber(challengeNumber)}`,
    "",
    ...rows,
    "",
    `${count}/${CELL_COUNT} · ${won ? "¡BINGO!" : "Terminado"} · ${hearts}`,
  ].join("\n");
}
