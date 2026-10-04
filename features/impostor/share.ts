import { formatChallengeNumber } from "@/lib/daily/calendar";
import { BOARD_SIZE, type ImpostorMode, type ImpostorPublicState } from "@/lib/impostor/types";

export const MODE_LABELS: Record<ImpostorMode, string> = { normal: "Normal", "one-by-one": "Uno a uno" };

export type CardOutcome = "right" | "wrong" | "pending";

/** Per card, in board order: did the player classify it right? (one-by-one: cards never reached are pending). */
export function cardOutcomes(cards: readonly number[], state: ImpostorPublicState): CardOutcome[] {
  const impostors = new Set(state.impostors ?? []);
  return cards.map((id, i) => {
    if (state.mode === "normal") return state.selection.includes(id) !== impostors.has(id) ? "right" : "wrong";
    const d = state.decisions[i];
    if (!d) return "pending";
    return (d === "impostor") === impostors.has(id) ? "right" : "wrong";
  });
}

const EMOJI: Record<CardOutcome, string> = { right: "🟩", wrong: "🟥", pending: "⬛" };

/**
 * Spoiler-free result: the category name (everyone sees it), the mode, one square
 * per card (right / wrong / not reached) and the score. Never Pokémon names.
 */
export function buildImpostorShareText(params: {
  challengeNumber: number;
  categoryShort: string;
  outcomes: readonly CardOutcome[];
  mode: ImpostorMode;
  help: boolean;
  score: number;
}): string {
  const { challengeNumber, categoryShort, outcomes, mode, help, score } = params;
  const tiles = outcomes.map((o) => EMOJI[o]);
  return [
    `🕵️ PokéImpostor ${formatChallengeNumber(challengeNumber)} · ${MODE_LABELS[mode]}`,
    categoryShort,
    "",
    tiles.slice(0, 5).join(" "),
    tiles.slice(5).join(" "),
    "",
    ...(help ? ["💡 Con pista"] : []),
    `Resultado: ${score}/${BOARD_SIZE}`,
  ].join("\n");
}
