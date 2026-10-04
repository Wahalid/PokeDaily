import type { PokemonSummary } from "@/lib/pokemon/types";

export const BINGO_SIZE = 4;
export const CELL_COUNT = BINGO_SIZE * BINGO_SIZE;
export const DECK_SIZE = 24;
export const MAX_LIVES = 3;
export const MAX_SKIPS = 3;

/** Server-side daily challenge: 16 category ids (row-major) + the ordered deck. Secret. */
export interface BingoChallenge {
  cells: string[];
  deck: number[];
}

/** A player move on the current card. */
export type BingoMove = { type: "place"; cell: number } | { type: "skip" };

export type BingoStatus = "playing" | "won" | "lost";
export type BingoEndReason = "complete" | "no-lives" | "deck-exhausted";

/** Client-safe description of a cell (the condition is visible to the player by design). */
export interface BingoCellView {
  categoryId: string;
  label: string;
  short: string;
}

/** Client-safe game state. Only the CURRENT card is ever included — never the rest of the deck. */
export interface BingoPublicState {
  placed: Array<PokemonSummary | null>;
  lives: number;
  skips: number;
  /** 1-based number of the current card, e.g. "card 5 of 24". */
  cardNumber: number;
  deckSize: number;
  current: PokemonSummary | null;
  status: BingoStatus;
  endReason?: BingoEndReason;
}

export type BingoLastResult =
  | { kind: "correct"; cell: number; pokemon: PokemonSummary }
  | { kind: "wrong"; cell: number; pokemon: PokemonSummary }
  | { kind: "skip"; pokemon: PokemonSummary };

export type BingoResponse =
  | { ok: true; state: BingoPublicState; last: BingoLastResult | null }
  | { ok: false; message: string };
