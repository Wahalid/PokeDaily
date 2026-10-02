import { toSummary, type Pokedex } from "@/lib/pokemon/pokedex";
import { compareGuess } from "./compare";
import { isGuessable } from "./daily";
import { MAX_GUESSES, type GuessResponse } from "./types";

/**
 * Validates one turn. `guessIds` is the full list of the player's guesses so
 * far, ending with the new one. Pure: used by the server action and by tests.
 */
export function playGuessTurn(params: { guessIds: readonly number[]; secretId: number; pokedex: Pokedex }): GuessResponse {
  const { guessIds, secretId, pokedex } = params;
  if (!Array.isArray(guessIds) || guessIds.length === 0 || !guessIds.every(Number.isInteger)) {
    return { ok: false, message: "Petición no válida." };
  }
  if (guessIds.length > MAX_GUESSES) {
    return { ok: false, message: "Ya no te quedan intentos." };
  }
  if (new Set(guessIds).size !== guessIds.length) {
    return { ok: false, message: "Ya has probado este Pokémon." };
  }
  const previous = guessIds.slice(0, -1);
  if (previous.includes(secretId)) {
    return { ok: false, message: "Ya has adivinado el Pokémon de hoy." };
  }

  const guess = pokedex.getById(guessIds[guessIds.length - 1]);
  const secret = pokedex.getById(secretId);
  if (!guess || !isGuessable(guess) || !secret) {
    return { ok: false, message: "Pokémon desconocido." };
  }

  const feedback = compareGuess(guess, secret);
  const finished = feedback.correct || guessIds.length >= MAX_GUESSES;
  return { ok: true, feedback, finished, answer: finished ? toSummary(secret) : undefined };
}
