"use server";

import { playCry } from "@/lib/cry/play";
import type { CryResponse } from "@/lib/cry/types";
import { currentChallengeNumber } from "@/lib/daily/calendar";
import { getPokedex } from "@/lib/pokemon/repository";
import { getDailyCry } from "@/lib/server/cry-service";

/** SUBMIT: the server replays every choice, reveals the answered rounds and sends only the next round's options. */
export async function submitCryChoices(input: { challengeNumber: number; choices: number[] }): Promise<CryResponse> {
  const n = input?.challengeNumber;
  if (!Number.isInteger(n) || n < 1 || n > currentChallengeNumber()) return { ok: false, message: "Petición no válida." };
  const { challenge } = getDailyCry(n);
  if (!challenge) return { ok: false, message: "El juego no está disponible en este momento." };
  const pokedex = getPokedex();
  return playCry(challenge, input.choices, (id) => pokedex.getById(id));
}
