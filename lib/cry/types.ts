/** PokéCry — shared types (server and client). */

export const CRY_ROUNDS = 5;
export const CRY_OPTIONS = 4;

export type CryDifficulty = "easy" | "normal" | "hard";

export interface CryRound {
  /** The Pokémon whose cry is played. */
  answer: number;
  /** Exactly 4 distinct ids, shuffled, including the answer. */
  options: number[];
  difficulty: CryDifficulty;
}

/** The full daily challenge (sealed on disk, server-only). */
export interface CryChallenge {
  rounds: CryRound[];
}

export interface CryOption {
  id: number;
  name: string;
  sprite: string | null;
}

/** A submitted round: what the player chose and what it really was. `choice` 0 = round voided (audio failed). */
export interface CryResult {
  choice: number;
  answer: number;
  correct: boolean;
  /** The round's options (already answered, so safe to keep for the feedback / reload). */
  options: CryOption[];
}

/** Everything the browser holds: past results and ONLY the current round's options. */
export interface CryPublicState {
  results: CryResult[];
  /** The round to play next (absent once the 5 are done). */
  current?: { index: number; options: CryOption[] };
  status: "playing" | "finished";
  score: number;
}

export type CryResponse = { ok: true; state: CryPublicState } | { ok: false; message: string };

/** Answer value that voids a round whose audio could not be played. */
export const VOID_CHOICE = 0;
