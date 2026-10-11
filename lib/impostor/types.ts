/** PokéImpostor — shared types (server and client). */

import type { PokemonType } from "@/lib/pokemon/types";

export const BOARD_SIZE = 10;

export type ImpostorMode = "normal" | "one-by-one";

/** The full daily challenge (sealed on disk, server-only). */
export interface ImpostorChallenge {
  categoryId: string;
  /** Board order (Pokémon ids), identical for every player. */
  cards: number[];
  /** Ids on the board that do NOT meet the category. */
  impostors: number[];
  /** The correct Pokémon the one-per-game help reveals (the least obvious one). */
  hintId: number;
}

/** What the page sends to the browser before playing: never the impostors. */
export interface ImpostorBoardView {
  title: string;
  /** Types of a type / dual-type category, so the UI can show their badges (presentation only). */
  types?: PokemonType[];
  short: string;
  note?: string;
  cards: Array<{ id: number; name: string; sprite: string | null }>;
  impostorCount: number;
}

export type Verdict = "correct" | "impostor";

export interface ImpostorMoves {
  mode: ImpostorMode;
  help: boolean;
  /** Normal mode: the final selection (absent until CHECK). */
  selection?: number[];
  /** One-by-one mode: one decision per card, in board order. */
  decisions?: Verdict[];
}

export interface ImpostorPublicState {
  mode: ImpostorMode;
  status: "playing" | "won" | "lost";
  /** Revealed by the help (always a correct Pokémon). */
  hintId?: number;
  /** One-by-one: decisions so far; all right except possibly the last one. */
  decisions: Verdict[];
  /** Normal: the checked selection. */
  selection: number[];
  /** Cards classified right (selected ⇔ correct). */
  score: number;
  /** Only once the game is over. */
  impostors?: number[];
}

export type ImpostorResponse = { ok: true; state: ImpostorPublicState } | { ok: false; message: string };
