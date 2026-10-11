"use server";

import { todayNumber } from "@/lib/server/test-day";
import { playBingo } from "@/lib/bingo/play";
import type { BingoResponse } from "@/lib/bingo/types";
import { getBingoData, getDailyBingo } from "@/lib/server/bingo-service";

/**
 * Applies the player's moves on the server (full replay, rules enforced) and
 * returns the public state: placed cards, counters and ONLY the card in play.
 */
export async function submitBingoMoves(input: { challengeNumber: number; moves: unknown[] }): Promise<BingoResponse> {
  const n = input?.challengeNumber;
  if (!Number.isInteger(n) || n < 1 || n > (await todayNumber())) return { ok: false, message: "Petición no válida." };
  const { challenge } = getDailyBingo(n);
  if (!challenge) return { ok: false, message: "El juego no está disponible en este momento." };
  return playBingo(challenge, input.moves, getBingoData());
}
