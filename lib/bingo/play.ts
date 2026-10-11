import { createHash } from "node:crypto";
import { toSummary } from "@/lib/pokemon/pokedex";
import type { Pokemon } from "@/lib/pokemon/types";
import { getQuartetCategory } from "@/lib/quartets/categories";
import type { QuartetsData } from "@/lib/quartets/generator";
import { createRng } from "@/lib/random";
import {
  CELL_COUNT,
  type BingoCellView,
  type BingoChallenge,
  type BingoEndReason,
  type BingoMove,
  type BingoPublicState,
  type BingoResponse,
  type BingoStatus,
} from "./types";

/**
 * Longest canonical history: 16 placements, a discard run between each of
 * them (17) and the failed tries of the current card (15) — plus the new move.
 * Discards are NOT limited by this: a run of any length is a single move.
 */
export const MAX_HISTORY = 64;

export function fitsCell(categoryId: string, pokemon: Pokemon | undefined): boolean {
  const category = getQuartetCategory(categoryId);
  return Boolean(category && pokemon && category.test(pokemon));
}

// ---------------------------------------------------------------------------
// Dealer: which Pokémon comes next, given the REAL state of the board
// ---------------------------------------------------------------------------

/**
 * The deterministic source of cards for one challenge: the frozen opening deck,
 * then an endless cycle over every base species that fits at least one cell
 * (familiar ones first, the opening deck last). Same for every player.
 */
interface Dealer {
  deck: readonly number[];
  cycle: readonly number[];
  /** Bit i set ⇔ the Pokémon fits cell i. Only Pokémon that fit some cell are present. */
  mask: ReadonlyMap<number, number>;
}

const dealers = new WeakMap<BingoChallenge, Dealer>();

function shuffle<T>(rng: () => number, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function dealerFor(challenge: BingoChallenge, data: QuartetsData): Dealer {
  let dealer = dealers.get(challenge);
  if (dealer) return dealer;
  const mask = new Map<number, number>();
  for (const p of data.pool) {
    let bits = 0;
    challenge.cells.forEach((cell, i) => {
      if (data.members.get(cell)?.has(p.id)) bits |= 1 << i;
    });
    if (bits) mask.set(p.id, bits);
  }
  // Seeded by the (secret) challenge itself: deterministic, never guessable from public data.
  const rng = createRng(createHash("sha256").update(`pokedaily:bingo:deal:${JSON.stringify(challenge)}`).digest("hex"));
  const inDeck = new Set(challenge.deck);
  const rest = [...mask.keys()].filter((id) => !inDeck.has(id));
  const cycle = [
    ...shuffle(rng, rest.filter((id) => data.familiar.has(id))),
    ...shuffle(rng, rest.filter((id) => !data.familiar.has(id))),
    ...challenge.deck.filter((id) => mask.has(id)),
  ];
  dealer = { deck: challenge.deck, cycle, mask };
  dealers.set(challenge, dealer);
  return dealer;
}

// ---------------------------------------------------------------------------
// Replay
// ---------------------------------------------------------------------------

interface ReplayState {
  placed: Array<number | null>;
  /** Position of the current card: < deck.length → opening deck; otherwise deck.length + index in the cycle. */
  pos: number;
  current: number | null;
  /** Pokémon presented so far (including the current one). */
  presented: number;
  discards: number;
  /** Cells the current card was already tried on without fitting. */
  wrongCells: number[];
  status: BingoStatus;
  endReason?: BingoEndReason;
  last: { kind: "correct" | "wrong"; cell: number; pokemonId: number } | { kind: "skip"; pokemonId: number } | null;
  /** Compacted history: committed moves (placements + merged discard runs) and the current card's failed tries. */
  moves: BingoMove[];
}

function isMove(value: unknown): value is BingoMove {
  if (!value || typeof value !== "object") return false;
  const move = value as Record<string, unknown>;
  if (move.type === "skip") return move.count === undefined || (Number.isSafeInteger(move.count) && (move.count as number) >= 1);
  return move.type === "place" && Number.isInteger(move.cell) && (move.cell as number) >= 0 && (move.cell as number) < CELL_COUNT;
}

/**
 * Replays a whole game from the start. Pure and authoritative: the server is
 * stateless, so every request re-applies all moves and enforces the rules.
 *
 * Dealing rule: a Pokémon is only presented if it fits at least one cell that
 * is FREE at that moment (and is not already on the board). Boards are
 * validated so that every reachable state stays completable
 * (`isAlwaysCompletable`), so there is always such a Pokémon.
 *
 * There are no lives and no discard limit: a wrong placement is just an ERROR
 * on that cell (the card stays in play), and discarding is free.
 */
export function replayBingo(
  challenge: BingoChallenge,
  moves: unknown,
  data: QuartetsData,
): { ok: true; state: ReplayState } | { ok: false; message: string } {
  if (!Array.isArray(moves) || moves.length > MAX_HISTORY) return { ok: false, message: "Petición no válida." };
  const dealer = dealerFor(challenge, data);
  const { deck, cycle, mask } = dealer;
  const placed = Array<number | null>(CELL_COUNT).fill(null);
  const onBoard = new Set<number>();
  let freeMask = (1 << CELL_COUNT) - 1;

  const playable = (id: number, allowPlaced = false) => ((mask.get(id) ?? 0) & freeMask) !== 0 && (allowPlaced || !onBoard.has(id));
  const cardAt = (pos: number) => (pos < deck.length ? deck[pos] : cycle[pos - deck.length]);

  /** First position ≥ `from` whose card is playable now (cards that fit no free cell are never presented). */
  const dealFrom = (from: number): number => {
    for (let p = from; p < deck.length; p++) if (playable(deck[p])) return p;
    const start = Math.max(0, from - deck.length) % cycle.length;
    for (const allowPlaced of [false, true]) {
      // Second pass is a defensive fallback only: validated boards never need it.
      for (let k = 0; k < cycle.length; k++) {
        const i = (start + k) % cycle.length;
        if (playable(cycle[i], allowPlaced)) return deck.length + i;
      }
    }
    return -1;
  };

  const state: ReplayState = {
    placed,
    pos: 0,
    current: null,
    presented: 0,
    discards: 0,
    wrongCells: [],
    status: "playing",
    last: null,
    moves: [],
  };
  const present = (pos: number) => {
    if (pos < 0) return false;
    state.pos = pos;
    state.current = cardAt(pos);
    state.presented++;
    state.wrongCells = [];
    return true;
  };
  if (!present(dealFrom(0))) return { ok: false, message: "El juego no está disponible en este momento." };

  /** Discards `count` cards in a row on an unchanged board (O(cycle) whatever the count). */
  const discard = (count: number) => {
    let left = count;
    while (left > 0 && state.pos < deck.length) {
      if (!present(dealFrom(state.pos + 1))) return;
      state.discards++;
      left--;
    }
    if (left === 0) return;
    let valid: number[] = [];
    for (const allowPlaced of [false, true]) {
      if (valid.length === 0) valid = cycle.flatMap((id, i) => (playable(id, allowPlaced) ? [i] : []));
    }
    if (valid.length === 0) return;
    const at = state.pos - deck.length;
    let rank = valid.findIndex((i) => i >= at);
    if (rank < 0) rank = valid.length;
    // If the current card is itself in `valid`, moving one step means rank + 1.
    const steps = valid[rank] === at ? left : left - 1;
    const target = valid[(rank + steps) % valid.length];
    state.pos = deck.length + target;
    state.current = cycle[target];
    state.wrongCells = [];
    state.presented += left;
    state.discards += left;
  };

  // The current card's failed tries are the last `wrongCells.length` moves; they change nothing once the card is gone.
  const dropFailedTries = () => (state.moves = state.moves.slice(0, state.moves.length - state.wrongCells.length));

  for (const move of moves) {
    if (!isMove(move)) return { ok: false, message: "Petición no válida." };
    if (state.status !== "playing" || state.current === null) return { ok: false, message: "La partida ha terminado." };
    const card = state.current;

    if (move.type === "skip") {
      const count = move.count ?? 1;
      dropFailedTries();
      const previous = state.moves[state.moves.length - 1];
      if (previous?.type === "skip") state.moves[state.moves.length - 1] = { type: "skip", count: (previous.count ?? 1) + count };
      else state.moves.push(count === 1 ? { type: "skip" } : { type: "skip", count });
      state.last = { kind: "skip", pokemonId: card };
      discard(count);
    } else if (placed[move.cell] !== null) {
      return { ok: false, message: "Esa casilla ya está ocupada." };
    } else if (((mask.get(card) ?? 0) >> move.cell) & 1) {
      dropFailedTries();
      state.moves.push({ type: "place", cell: move.cell });
      placed[move.cell] = card;
      onBoard.add(card);
      freeMask &= ~(1 << move.cell);
      state.last = { kind: "correct", cell: move.cell, pokemonId: card };
      if (freeMask === 0) {
        state.status = "won";
        state.endReason = "complete";
        state.current = null;
        state.wrongCells = [];
      } else if (!present(dealFrom(state.pos + 1))) {
        return { ok: false, message: "El juego no está disponible en este momento." };
      }
    } else {
      // ERROR on that cell only: no penalty, the same card stays in play.
      if (!state.wrongCells.includes(move.cell)) {
        state.wrongCells.push(move.cell);
        state.moves.push({ type: "place", cell: move.cell });
      }
      state.last = { kind: "wrong", cell: move.cell, pokemonId: card };
    }
  }
  return { ok: true, state };
}

/** Client-safe view: placed cards, counters, and ONLY the current card. */
export function toPublicState(state: ReplayState, data: QuartetsData): BingoPublicState {
  const summary = (id: number) => toSummary(data.byId.get(id)!);
  return {
    placed: state.placed.map((id) => (id === null ? null : summary(id))),
    wrongCells: state.status === "playing" ? [...state.wrongCells] : [],
    discards: state.discards,
    cardNumber: state.presented,
    current: state.status === "playing" && state.current !== null ? summary(state.current) : null,
    status: state.status,
    endReason: state.endReason,
  };
}

/** One request: replay `moves` and return the public state, the last move's result and the compacted history. */
export function playBingo(challenge: BingoChallenge, moves: unknown, data: QuartetsData): BingoResponse {
  const replay = replayBingo(challenge, moves, data);
  if (!replay.ok) return replay;
  const { state } = replay;
  const last = state.last;
  const pokemon = last ? toSummary(data.byId.get(last.pokemonId)!) : null;
  return {
    ok: true,
    state: toPublicState(state, data),
    last: !last || !pokemon ? null : last.kind === "skip" ? { kind: "skip", pokemon } : { kind: last.kind, cell: last.cell, pokemon },
    moves: state.moves,
  };
}

/** The 16 cell conditions (shown to the player by design). */
export function cellViews(challenge: BingoChallenge): BingoCellView[] {
  return challenge.cells.map((id) => {
    const category = getQuartetCategory(id);
    return { categoryId: id, label: category?.label ?? id, short: category?.short ?? category?.label ?? id };
  });
}
