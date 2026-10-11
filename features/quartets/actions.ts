"use server";

import { todayNumber } from "@/lib/server/test-day";
import { getPokedex } from "@/lib/pokemon/repository";
import { checkSelection } from "@/lib/quartets/play";
import type { QuartetGuessResponse } from "@/lib/quartets/types";
import { getDailyQuartets } from "@/lib/server/quartets-service";

const UNAVAILABLE = { ok: false as const, message: "El juego no está disponible en este momento." };

async function boardFor(challengeNumber: unknown) {
  if (!Number.isInteger(challengeNumber) || (challengeNumber as number) < 1 || (challengeNumber as number) > (await todayNumber())) {
    return null;
  }
  return getDailyQuartets(challengeNumber as number).board;
}

/** Checks a selection of 4 on the server (the grouping never reaches the client). */
export async function submitQuartet(input: { challengeNumber: number; selection: number[] }): Promise<QuartetGuessResponse> {
  const board = await boardFor(input?.challengeNumber);
  if (!board) return UNAVAILABLE;
  const pokedex = getPokedex();
  return checkSelection(board, input.selection, (id) => pokedex.getById(id));
}
