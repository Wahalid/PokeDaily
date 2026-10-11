"use server";

import { todayNumber } from "@/lib/server/test-day";
import { getDailyWordle, getWordleDictionary } from "@/lib/server/wordle-service";
import { playWordle } from "@/lib/wordle/play";
import type { WordleResponse } from "@/lib/wordle/types";

/** Validates the player's guesses on the server (full replay) and returns only the letter feedback. */
export async function submitWordleGuess(input: { challengeNumber: number; guesses: string[] }): Promise<WordleResponse> {
  const n = input?.challengeNumber;
  if (!Number.isInteger(n) || n < 1 || n > (await todayNumber())) return { ok: false, message: "Petición no válida." };
  const { challenge } = getDailyWordle(n);
  if (!challenge) return { ok: false, message: "El juego no está disponible en este momento." };
  return playWordle(challenge, input.guesses, getWordleDictionary());
}
