"use server";

import { currentChallengeNumber } from "@/lib/daily/calendar";
import { playGuessTurn } from "@/lib/guess/play";
import type { GuessResponse } from "@/lib/guess/types";
import { getPokedex } from "@/lib/pokemon/repository";
import { getDailyGuess } from "@/lib/server/guess-service";

export interface SubmitGuessInput {
  challengeNumber: number;
  /** All guesses so far, ending with the new one. */
  guessIds: number[];
}

/**
 * Checks a guess on the server so the secret Pokémon never reaches the
 * client until the game is over.
 */
export async function submitGuess(input: SubmitGuessInput): Promise<GuessResponse> {
  const { challengeNumber, guessIds } = input ?? {};
  if (!Number.isInteger(challengeNumber) || challengeNumber < 1 || challengeNumber > currentChallengeNumber()) {
    return { ok: false, message: "Petición no válida." };
  }
  const { pokemonId } = getDailyGuess(challengeNumber);
  if (pokemonId === null) {
    return { ok: false, message: "El juego no está disponible en este momento." };
  }
  return playGuessTurn({ guessIds, secretId: pokemonId, pokedex: getPokedex() });
}
