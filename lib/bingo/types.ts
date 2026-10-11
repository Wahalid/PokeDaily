import type { PokemonSummary } from "@/lib/pokemon/types";

export const BINGO_SIZE = 4;
export const CELL_COUNT = BINGO_SIZE * BINGO_SIZE;
/** Cards in the frozen opening sequence. After it, cards are dealt from the whole pool (discards are unlimited). */
export const DECK_SIZE = 24;

/** Server-side daily challenge: 16 category ids (row-major) + the ordered opening deck. Secret. */
export interface BingoChallenge {
  cells: string[];
  deck: number[];
}

/**
 * A player move on the current card. Consecutive discards travel as one move
 * with a `count` (default 1), so the history stays short however many
 * Pokémon are discarded.
 */
export type BingoMove = { type: "place"; cell: number } | { type: "skip"; count?: number };

export type BingoStatus = "playing" | "won";
export type BingoEndReason = "complete";

/** Client-safe description of a cell (the condition is visible to the player by design). */
export interface BingoCellView {
  categoryId: string;
  label: string;
  short: string;
}

/** Client-safe game state. Only the CURRENT card is ever included — never the cards to come. */
export interface BingoPublicState {
  placed: Array<PokemonSummary | null>;
  /** Cells where the CURRENT Pokémon was already tried and doesn't fit (shown as ERROR; no penalty). */
  wrongCells: number[];
  /** Pokémon discarded so far (free and unlimited). */
  discards: number;
  /** 1-based number of the Pokémon in play, counting every Pokémon presented so far. */
  cardNumber: number;
  current: PokemonSummary | null;
  status: BingoStatus;
  endReason?: BingoEndReason;
}

export type BingoLastResult =
  | { kind: "correct"; cell: number; pokemon: PokemonSummary }
  | { kind: "wrong"; cell: number; pokemon: PokemonSummary }
  | { kind: "skip"; pokemon: PokemonSummary };

export type BingoResponse =
  | {
      ok: true;
      state: BingoPublicState;
      last: BingoLastResult | null;
      /** Canonical (compacted) history to send back with the next move. */
      moves: BingoMove[];
    }
  | { ok: false; message: string };
