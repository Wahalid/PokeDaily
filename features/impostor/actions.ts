"use server";

import { todayNumber } from "@/lib/server/test-day";
import { playImpostor } from "@/lib/impostor/play";
import type { ImpostorMoves, ImpostorResponse } from "@/lib/impostor/types";
import { getDailyImpostor } from "@/lib/server/impostor-service";

/** Validates the player's moves on the server (full replay) and reveals the impostors only when the game is over. */
export async function submitImpostorMoves(input: { challengeNumber: number; moves: ImpostorMoves }): Promise<ImpostorResponse> {
  const n = input?.challengeNumber;
  if (!Number.isInteger(n) || n < 1 || n > (await todayNumber())) return { ok: false, message: "Petición no válida." };
  const { challenge } = getDailyImpostor(n);
  if (!challenge) return { ok: false, message: "El juego no está disponible en este momento." };
  return playImpostor(challenge, input.moves);
}
