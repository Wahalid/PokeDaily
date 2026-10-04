import { toSummary } from "@/lib/pokemon/pokedex";
import type { Pokemon } from "@/lib/pokemon/types";
import { getQuartetCategory } from "@/lib/quartets/categories";
import {
  CELL_COUNT,
  MAX_LIVES,
  MAX_SKIPS,
  type BingoCellView,
  type BingoChallenge,
  type BingoEndReason,
  type BingoMove,
  type BingoPublicState,
  type BingoResponse,
  type BingoStatus,
} from "./types";

type Lookup = (id: number) => Pokemon | undefined;

interface ReplayState {
  placed: Array<number | null>;
  lives: number;
  skips: number;
  /** Index of the current card in the deck. */
  cursor: number;
  status: BingoStatus;
  endReason?: BingoEndReason;
  last: { kind: "correct" | "wrong"; cell: number; pokemonId: number } | { kind: "skip"; pokemonId: number } | null;
}

export function fitsCell(categoryId: string, pokemon: Pokemon | undefined): boolean {
  const category = getQuartetCategory(categoryId);
  return Boolean(category && pokemon && category.test(pokemon));
}

function isMove(value: unknown): value is BingoMove {
  if (!value || typeof value !== "object") return false;
  const move = value as Record<string, unknown>;
  if (move.type === "skip") return true;
  return move.type === "place" && Number.isInteger(move.cell) && (move.cell as number) >= 0 && (move.cell as number) < CELL_COUNT;
}

/**
 * Replays a whole game from the start. Pure and authoritative: the server is
 * stateless, so every request re-applies all moves and enforces the rules
 * (lives, skips, occupied cells, game over).
 */
export function replayBingo(
  challenge: BingoChallenge,
  moves: unknown,
  lookup: Lookup,
): { ok: true; state: ReplayState } | { ok: false; message: string } {
  if (!Array.isArray(moves) || moves.length > challenge.deck.length) return { ok: false, message: "Petición no válida." };
  const state: ReplayState = {
    placed: Array<number | null>(CELL_COUNT).fill(null),
    lives: MAX_LIVES,
    skips: MAX_SKIPS,
    cursor: 0,
    status: "playing",
    last: null,
  };

  for (const move of moves) {
    if (!isMove(move)) return { ok: false, message: "Petición no válida." };
    if (state.status !== "playing") return { ok: false, message: "La partida ha terminado." };
    const card = challenge.deck[state.cursor];

    if (move.type === "skip") {
      if (state.skips === 0) return { ok: false, message: "No te quedan saltos." };
      state.skips--;
      state.last = { kind: "skip", pokemonId: card };
    } else {
      if (state.placed[move.cell] !== null) return { ok: false, message: "Esa casilla ya está ocupada." };
      if (fitsCell(challenge.cells[move.cell], lookup(card))) {
        state.placed[move.cell] = card;
        state.last = { kind: "correct", cell: move.cell, pokemonId: card };
      } else {
        state.lives--;
        state.last = { kind: "wrong", cell: move.cell, pokemonId: card };
      }
    }
    state.cursor++;

    if (state.placed.every((id) => id !== null)) {
      state.status = "won";
      state.endReason = "complete";
    } else if (state.lives <= 0) {
      state.status = "lost";
      state.endReason = "no-lives";
    } else if (state.cursor >= challenge.deck.length) {
      state.status = "lost";
      state.endReason = "deck-exhausted";
    }
  }
  return { ok: true, state };
}

/** Client-safe view: placed cards, counters, and ONLY the current card. */
export function toPublicState(challenge: BingoChallenge, state: ReplayState, lookup: Lookup): BingoPublicState {
  const summary = (id: number) => toSummary(lookup(id)!);
  return {
    placed: state.placed.map((id) => (id === null ? null : summary(id))),
    lives: state.lives,
    skips: state.skips,
    cardNumber: Math.min(state.cursor + 1, challenge.deck.length),
    deckSize: challenge.deck.length,
    current: state.status === "playing" ? summary(challenge.deck[state.cursor]) : null,
    status: state.status,
    endReason: state.endReason,
  };
}

/** One request: replay `moves` and return the public state + the last move's result. */
export function playBingo(challenge: BingoChallenge, moves: unknown, lookup: Lookup): BingoResponse {
  const replay = replayBingo(challenge, moves, lookup);
  if (!replay.ok) return replay;
  const { state } = replay;
  const last = state.last;
  const pokemon = last ? toSummary(lookup(last.pokemonId)!) : null;
  return {
    ok: true,
    state: toPublicState(challenge, state, lookup),
    last: !last || !pokemon ? null : last.kind === "skip" ? { kind: "skip", pokemon } : { kind: last.kind, cell: last.cell, pokemon },
  };
}

/** The 16 cell conditions (shown to the player by design). */
export function cellViews(challenge: BingoChallenge): BingoCellView[] {
  return challenge.cells.map((id) => {
    const category = getQuartetCategory(id);
    return { categoryId: id, label: category?.label ?? id, short: category?.short ?? category?.label ?? id };
  });
}
