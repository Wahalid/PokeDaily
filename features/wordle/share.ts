import { formatChallengeNumber } from "@/lib/daily/calendar";
import { MAX_ATTEMPTS, type LetterState, type WordleRow } from "@/lib/wordle/types";

const EMOJI: Record<LetterState, string> = { correct: "🟩", present: "🟨", absent: "⬜" };

/** Spoiler-free result: only the colour pattern of each row and the score. Never letters or the name. */
export function buildWordleShareText(params: { challengeNumber: number; rows: readonly WordleRow[]; won: boolean }): string {
  const { challengeNumber, rows, won } = params;
  return [
    `PokéWordle ${formatChallengeNumber(challengeNumber)}`,
    ...rows.map((r) => r.pattern.map((s) => EMOJI[s]).join("")),
    "",
    `${won ? rows.length : "X"}/${MAX_ATTEMPTS}`,
  ].join("\n");
}
