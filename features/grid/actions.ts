"use server";

import { validateAnswer } from "@/lib/grid/engine";
import type { AnswerResult } from "@/lib/grid/types";
import { getPokedex } from "@/lib/pokemon/repository";
import { getDailyGrid, isPlayableChallenge } from "@/lib/server/grid-service";

export interface SubmitGridAnswerInput {
  challengeNumber: number;
  cellIndex: number;
  pokemonId: number;
  usedPokemonIds: number[];
}

/**
 * Validates a Grid answer on the server, so the client never needs to
 * download the list of correct answers.
 */
export async function submitGridAnswer(input: SubmitGridAnswerInput): Promise<AnswerResult> {
  const { challengeNumber, cellIndex, pokemonId, usedPokemonIds } = input ?? {};
  if (
    !isPlayableChallenge(challengeNumber) ||
    !Number.isInteger(cellIndex) ||
    !Number.isInteger(pokemonId) ||
    !Array.isArray(usedPokemonIds) ||
    !usedPokemonIds.every(Number.isInteger)
  ) {
    return { ok: false, reason: "invalid-cell", message: "Invalid request." };
  }

  const { definition } = getDailyGrid(challengeNumber);
  return validateAnswer({
    definition,
    cellIndex,
    pokemon: getPokedex().getById(pokemonId),
    usedPokemonIds,
  });
}
