import type { PokemonColor, PokemonSummary, PokemonType } from "@/lib/pokemon/types";

/** Attempts per daily game. */
export const MAX_GUESSES = 8;

export type EvolutionPhase = "none" | "first" | "second" | "third";

/** Result of comparing one guessed Pokémon with the secret one (client-safe). */
export interface GuessFeedback {
  pokemon: PokemonSummary;
  /** Each of the guess's types, and whether the secret has it (order-independent). */
  types: Array<{ type: PokemonType; match: boolean }>;
  generation: { value: number; match: boolean };
  phase: { value: EvolutionPhase; match: boolean };
  color: { value: PokemonColor; match: boolean };
  /** "higher" = the secret's Pokédex number is higher (⬆️); "lower" = lower (⬇️). */
  dex: { value: number; direction: "match" | "higher" | "lower" };
  correct: boolean;
}

export type GuessResponse =
  | {
      ok: true;
      feedback: GuessFeedback;
      /** True once the game is over (solved or out of attempts). */
      finished: boolean;
      /** Revealed only when the game is over. */
      answer?: PokemonSummary;
    }
  | { ok: false; message: string };
