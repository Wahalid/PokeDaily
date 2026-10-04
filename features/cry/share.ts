import { formatChallengeNumber } from "@/lib/daily/calendar";
import { CRY_ROUNDS, VOID_CHOICE, type CryResult } from "@/lib/cry/types";

/** 🟩 right · 🟥 wrong · ⬛ voided (audio failed) · ⬜ not played yet. */
export function roundSquares(results: readonly CryResult[]): string[] {
  return Array.from({ length: CRY_ROUNDS }, (_, i) => {
    const r = results[i];
    if (!r) return "⬜";
    if (r.choice === VOID_CHOICE) return "⬛";
    return r.correct ? "🟩" : "🟥";
  });
}

/** Spoiler-free result: only the squares and the score. Never names, sprites, types or generations. */
export function buildCryShareText(params: { challengeNumber: number; results: readonly CryResult[] }): string {
  const score = params.results.filter((r) => r.correct).length;
  return [`PokéCry ${formatChallengeNumber(params.challengeNumber)}`, "", roundSquares(params.results).join(" "), "", `${score}/${CRY_ROUNDS} 🎧`].join("\n");
}
