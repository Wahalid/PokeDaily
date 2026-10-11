"use server";

import { todayNumber } from "@/lib/server/test-day";
import { getPokedex } from "@/lib/pokemon/repository";
import { getDailyTop10 } from "@/lib/server/top10-service";
import { playTop10 } from "@/lib/top10/play";
import type { Top10Response } from "@/lib/top10/types";

/**
 * Validates the player's guesses on the server (full replay) and reveals only
 * what was earned. `gaveUpAt` marks a Give Up: the full ranking is revealed.
 */
export async function submitTop10Guess(input: { challengeNumber: number; guessIds: number[]; gaveUpAt?: number }): Promise<Top10Response> {
  const n = input?.challengeNumber;
  if (!Number.isInteger(n) || n < 1 || n > (await todayNumber())) return { ok: false, message: "Petición no válida." };
  const { challenge } = getDailyTop10(n);
  if (!challenge) return { ok: false, message: "El juego no está disponible en este momento." };
  const pokedex = getPokedex();
  return playTop10(challenge, input.guessIds, (id) => pokedex.getById(id), input.gaveUpAt);
}
