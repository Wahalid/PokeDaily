"use server";

import { currentChallengeNumber } from "@/lib/daily/calendar";
import { getPokedex } from "@/lib/pokemon/repository";
import { checkSelection, revealAfterLoss } from "@/lib/quartets/play";
import type { QuartetGuessResponse, QuartetRevealResponse } from "@/lib/quartets/types";
import { getDailyQuartets } from "@/lib/server/quartets-service";

const UNAVAILABLE = { ok: false as const, message: "El juego no está disponible en este momento." };

function boardFor(challengeNumber: unknown) {
  if (!Number.isInteger(challengeNumber) || (challengeNumber as number) < 1 || (challengeNumber as number) > currentChallengeNumber()) {
    return null;
  }
  return getDailyQuartets(challengeNumber as number).board;
}

/** Checks a selection of 4 on the server (the grouping never reaches the client). */
export async function submitQuartet(input: { challengeNumber: number; selection: number[] }): Promise<QuartetGuessResponse> {
  const board = boardFor(input?.challengeNumber);
  if (!board) return UNAVAILABLE;
  const pokedex = getPokedex();
  return checkSelection(board, input.selection, (id) => pokedex.getById(id));
}

/** Reveals the four groups after a loss (requires the 4 wrong selections). */
export async function revealQuartets(input: { challengeNumber: number; wrongSelections: number[][] }): Promise<QuartetRevealResponse> {
  const board = boardFor(input?.challengeNumber);
  if (!board) return UNAVAILABLE;
  const pokedex = getPokedex();
  return revealAfterLoss(board, input.wrongSelections, (id) => pokedex.getById(id));
}
