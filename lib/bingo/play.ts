import { toSummary } from "@/lib/pokemon/pokedex";
import type { Pokemon } from "@/lib/pokemon/types";
import { getQuartetCategory } from "@/lib/quartets/categories";
import {
  CELL_COUNT,
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
  skips: number;
  /** Index of the current card in the deck. */
  cursor: number;
  /** Cells the current card was already tried on without fitting. */
  wrongCells: number[];
  /** Cards discarded for free by the last move (no free cell fits them and no skips are left). */
  autoDiscarded: number[];
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
 * (skips, occupied cells, game over).
 *
 * There are no lives: placing a card on a cell it doesn't fit is just an
 * ERROR on that cell — the card stays in play and can be tried elsewhere.
 * If the card in play fits no free cell and no skips are left, it is
 * discarded for free (otherwise the game would be stuck).
 */
export function replayBingo(
  challenge: BingoChallenge,
  moves: unknown,
  lookup: Lookup,
): { ok: true; state: ReplayState } | { ok: false; message: string } {
  // Failed tries don't consume cards, so a game has at most one try per cell per card plus the card itself.
  if (!Array.isArray(moves) || moves.length > challenge.deck.length * (CELL_COUNT + 1)) return { ok: false, message: "Petición no válida." };
  const state: ReplayState = {
    placed: Array<number | null>(CELL_COUNT).fill(null),
    skips: MAX_SKIPS,
    cursor: 0,
    wrongCells: [],
    autoDiscarded: [],
    status: "playing",
    last: null,
  };
  const fitsAnyFreeCell = (card: number) =>
    state.placed.some((id, cell) => id === null && fitsCell(challenge.cells[cell], lookup(card)));
  const advance = () => {
    state.cursor++;
    state.wrongCells = [];
    while (state.skips === 0 && state.cursor < challenge.deck.length && state.placed.some((id) => id === null) && !fitsAnyFreeCell(challenge.deck[state.cursor])) {
      state.autoDiscarded.push(challenge.deck[state.cursor]);
      state.cursor++;
    }
  };

  for (const move of moves) {
    if (!isMove(move)) return { ok: false, message: "Petición no válida." };
    if (state.status !== "playing") return { ok: false, message: "La partida ha terminado." };
    const card = challenge.deck[state.cursor];
    state.autoDiscarded = [];

    if (move.type === "skip") {
      if (state.skips === 0) return { ok: false, message: "No te quedan saltos." };
      state.skips--;
      state.last = { kind: "skip", pokemonId: card };
      advance();
    } else {
      if (state.placed[move.cell] !== null) return { ok: false, message: "Esa casilla ya está ocupada." };
      if (fitsCell(challenge.cells[move.cell], lookup(card))) {
        state.placed[move.cell] = card;
        state.last = { kind: "correct", cell: move.cell, pokemonId: card };
        advance();
      } else {
        // ERROR on that cell only: no penalty, same card stays in play.
        if (!state.wrongCells.includes(move.cell)) state.wrongCells.push(move.cell);
        state.last = { kind: "wrong", cell: move.cell, pokemonId: card };
      }
    }

    if (state.placed.every((id) => id !== null)) {
      state.status = "won";
      state.endReason = "complete";
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
    wrongCells: state.status === "playing" ? [...state.wrongCells] : [],
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
    autoDiscarded: state.autoDiscarded.map((id) => toSummary(lookup(id)!)),
  };
}

/** The 16 cell conditions (shown to the player by design). */
export function cellViews(challenge: BingoChallenge): BingoCellView[] {
  return challenge.cells.map((id) => {
    const category = getQuartetCategory(id);
    return { categoryId: id, label: category?.label ?? id, short: category?.short ?? category?.label ?? id };
  });
}
