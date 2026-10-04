import { scoreGuess } from "./compare";
import { MAX_ATTEMPTS, type WordleChallenge, type WordlePublicState, type WordleResponse, type WordleRow } from "./types";
import { normalizeName, type WordleDictionary } from "./words";

export const initialWordleState = (challenge: WordleChallenge): WordlePublicState => ({
  length: challenge.word.length,
  rows: [],
  status: "playing",
});

const MAX_INPUT = 40;

/**
 * Stateless replay (server): validates every guess in order and returns the
 * public state. Only the LAST guess may be rejected with a player-facing
 * message (it costs no attempt); a bad earlier guess means a tampered request.
 * The secret is revealed only when the game is over.
 */
export function playWordle(challenge: WordleChallenge, guesses: unknown, dict: WordleDictionary): WordleResponse {
  if (!Array.isArray(guesses) || guesses.length === 0 || guesses.length > MAX_ATTEMPTS) {
    return { ok: false, message: "Petición no válida." };
  }
  const secret = challenge.word;
  const rows: WordleRow[] = [];
  let status: WordlePublicState["status"] = "playing";

  for (let i = 0; i < guesses.length; i++) {
    const raw = guesses[i];
    const last = i === guesses.length - 1;
    const reject = (message: string): WordleResponse => ({ ok: false, message: last ? message : "Petición no válida." });
    if (typeof raw !== "string" || raw.length > MAX_INPUT) return reject("Pokémon no válido");
    if (status !== "playing") return reject("La partida ha terminado.");
    const word = normalizeName(raw);
    if (!dict.byWord.has(word)) return reject("Pokémon no válido");
    if (word.length !== secret.length) return reject(`Debe tener ${secret.length} letras`);
    if (rows.some((r) => r.word === word)) return reject("Ya lo has probado.");
    rows.push({ word, pattern: scoreGuess(word, secret) });
    if (word === secret) status = "won";
    else if (rows.length === MAX_ATTEMPTS) status = "lost";
  }

  const state: WordlePublicState = { length: secret.length, rows, status };
  if (status !== "playing") {
    const entry = dict.byWord.get(secret)!;
    state.answer = {
      name: entry.name,
      sprites: entry.ids.flatMap((id) => dict.byId.get(id)?.sprites.default ?? []),
    };
  }
  return { ok: true, state };
}
