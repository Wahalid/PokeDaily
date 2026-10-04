import type { Pokemon } from "@/lib/pokemon/types";
import { CRY_ROUNDS, VOID_CHOICE, type CryChallenge, type CryOption, type CryPublicState, type CryResponse, type CryResult } from "./types";

const option = (id: number, lookup: (id: number) => Pokemon | undefined): CryOption => {
  const p = lookup(id)!;
  return { id, name: p.name, sprite: p.sprites.default };
};

/** Round `index`'s four options — the only round data the browser ever gets before answering. */
export const roundOptions = (challenge: CryChallenge, index: number, lookup: (id: number) => Pokemon | undefined) =>
  challenge.rounds[index].options.map((id) => option(id, lookup));

export const initialCryState = (challenge: CryChallenge, lookup: (id: number) => Pokemon | undefined): CryPublicState => ({
  results: [],
  current: { index: 0, options: roundOptions(challenge, 0, lookup) },
  status: "playing",
  score: 0,
});

/**
 * Stateless replay (server): `choices[i]` is the Pokémon picked in round i
 * (or VOID_CHOICE if the round's audio could not be played). Each choice must
 * be one of that round's 4 options. Returns the results so far (revealing each
 * answered round's solution) and only the NEXT round's options.
 */
export function playCry(challenge: CryChallenge, choices: unknown, lookup: (id: number) => Pokemon | undefined): CryResponse {
  if (!Array.isArray(choices) || choices.length === 0) return { ok: false, message: "Petición no válida." };
  if (choices.length > CRY_ROUNDS) return { ok: false, message: "La partida ha terminado." };
  const results: CryResult[] = [];
  for (const [i, choice] of choices.entries()) {
    const round = challenge.rounds[i];
    if (!Number.isInteger(choice) || (choice !== VOID_CHOICE && !round.options.includes(choice))) {
      return { ok: false, message: "Esa opción no pertenece a la ronda." };
    }
    results.push({ choice, answer: round.answer, correct: choice === round.answer, options: roundOptions(challenge, i, lookup) });
  }
  const next = results.length;
  const state: CryPublicState = {
    results,
    status: next === CRY_ROUNDS ? "finished" : "playing",
    score: results.filter((r) => r.correct).length,
  };
  if (next < CRY_ROUNDS) state.current = { index: next, options: roundOptions(challenge, next, lookup) };
  return { ok: true, state };
}
