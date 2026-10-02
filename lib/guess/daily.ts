import type { ChallengeStore } from "@/lib/daily/challenge-store";
import { dateForChallengeNumber, type DateKey } from "@/lib/daily/calendar";
import type { Pokemon } from "@/lib/pokemon/types";
import { createRng } from "@/lib/random";
import { decryptAnswer, secretOrderSeed, type EncryptedAnswer } from "./secret";

/**
 * Daily secret Pokémon for "Adivina el Pokémon".
 *
 * Security model (the repository is public):
 * - Frozen days (data/daily-challenges.json, `guess` section) store the answer
 *   ENCRYPTED with GUESS_SECRET_KEY — never in plain text.
 * - Non-frozen days use a shuffle seeded from an HMAC of that same key, so the
 *   public code cannot be used to compute future answers.
 * - Without the key the game reports itself unavailable instead of guessing.
 *
 * Bump GUESS_VERSION if the selection logic changes.
 */
export const GUESS_VERSION = "2.0.0";

/** Only regular species are eligible (our dataset stores forms inside their species). */
export function isGuessable(pokemon: Pokemon): boolean {
  return pokemon.id === pokemon.dexNumber;
}

/** Seeded Fisher–Yates order of eligible species ids. The seed must be secret (see secretOrderSeed). */
export function guessOrder(pokemon: readonly Pokemon[], seed: string): number[] {
  const ids = pokemon.filter(isGuessable).map((p) => p.id).sort((a, b) => a - b);
  const rng = createRng(seed);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export function pickDailyGuess(number: number, order: readonly number[]): number {
  return order[(((number - 1) % order.length) + order.length) % order.length];
}

/** A frozen daily secret, as stored in data/daily-challenges.json. Contains no plain answer. */
export interface FrozenGuess {
  /** AES-256-GCM encrypted Pokémon id, bound to the challenge number. */
  answer: EncryptedAnswer;
  generatorVersion: string;
  dataset: { count: number; hash: string };
  /**
   * Random value generated at freeze time. Used as the client's progress key,
   * so saved progress resets if a day is ever re-frozen — without exposing
   * anything derived from the answer.
   */
  salt: string;
  frozenAt: string;
}

export interface DailyGuess {
  number: number;
  date: DateKey;
  /** null when the secret key is missing/invalid: the game is unavailable. */
  pokemonId: number | null;
  /** Opaque, answer-independent key for client progress. */
  progressKey: string;
  source: "frozen" | "generated" | "unavailable";
}

let cachedOrder: { pokemon: readonly Pokemon[]; key: Buffer; order: number[] } | null = null;

/** Resolves the secret for a challenge number. Frozen days win; never throws. */
export function resolveDailyGuess(
  number: number,
  deps: {
    pokemon: readonly Pokemon[];
    store: ChallengeStore;
    /** 32-byte secret key (GUESS_SECRET_KEY), or null if not configured. */
    key: Buffer | null;
    onWarning?: (message: string) => void;
  },
): DailyGuess {
  const date = dateForChallengeNumber(number);
  const warn = deps.onWarning ?? (() => {});
  const stored = deps.store.get<FrozenGuess>("guess", number);

  if (!deps.key) {
    warn(`GUESS_SECRET_KEY is missing or invalid; "Adivina el Pokémon" is unavailable.`);
    return { number, date, pokemonId: null, progressKey: stored?.payload.salt ?? "unavailable", source: "unavailable" };
  }

  if (stored) {
    const id = stored.payload.answer ? decryptAnswer(stored.payload.answer, number, deps.key) : null;
    if (id !== null && deps.pokemon.some((p) => p.id === id && isGuessable(p))) {
      return { number, date: stored.date, pokemonId: id, progressKey: stored.payload.salt, source: "frozen" };
    }
    // Never fall back to a different Pokémon for a frozen day: a wrong key must not change answers silently.
    warn(`Frozen guess #${number} could not be decrypted (wrong GUESS_SECRET_KEY?); game unavailable.`);
    return { number, date, pokemonId: null, progressKey: stored.payload.salt, source: "unavailable" };
  }

  warn(`Guess #${number} is not frozen; generating on the fly. Run \`npm run guess:freeze\`.`);
  if (cachedOrder?.pokemon !== deps.pokemon || !cachedOrder.key.equals(deps.key)) {
    cachedOrder = { pokemon: deps.pokemon, key: deps.key, order: guessOrder(deps.pokemon, secretOrderSeed(deps.key, GUESS_VERSION)) };
  }
  return {
    number,
    date,
    pokemonId: pickDailyGuess(number, cachedOrder.order),
    progressKey: `generated:v${GUESS_VERSION}`,
    source: "generated",
  };
}
