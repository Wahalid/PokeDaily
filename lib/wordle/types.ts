/** PokéWordle — shared types (server and client). */

export const MAX_ATTEMPTS = 6;

/** 🟩 correct (right letter, right place) · 🟨 present (elsewhere) · ⬜ absent. */
export type LetterState = "correct" | "present" | "absent";

/** A Pokémon as PokéWordle sees it: one entry per normalized name. */
export interface WordleEntry {
  /** Normalized name (see normalizeName): the word the player types. */
  word: string;
  /** Display name (Nidoran♀/♂ → "Nidoran"). */
  name: string;
  /** Pokémon ids sharing this word (two for Nidoran, one otherwise). */
  ids: number[];
}

/** The daily secret (sealed on disk). */
export interface WordleChallenge {
  word: string;
}

export interface WordleRow {
  word: string;
  pattern: LetterState[];
}

/** Everything the browser receives: never the secret while playing. */
export interface WordlePublicState {
  length: number;
  rows: WordleRow[];
  status: "playing" | "won" | "lost";
  /** Only once the game is over. */
  answer?: { name: string; sprites: string[] };
}

export type WordleResponse =
  | { ok: true; state: WordlePublicState }
  | { ok: false; message: string };
