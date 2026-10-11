import { clauseImageSrc } from "@/lib/pokemon/clause-images";
import { typesOfCategory } from "@/lib/pokemon/type-names";
import type { Pokemon } from "@/lib/pokemon/types";
import { getImpostorCategory } from "./categories";
import {
  BOARD_SIZE,
  type ImpostorBoardView,
  type ImpostorChallenge,
  type ImpostorMode,
  type ImpostorPublicState,
  type ImpostorResponse,
  type Verdict,
} from "./types";

/** What the browser gets before playing: the visible category and the cards, never who is an impostor. */
export function boardView(challenge: ImpostorChallenge, lookup: (id: number) => Pokemon | undefined): ImpostorBoardView {
  const category = getImpostorCategory(challenge.categoryId)!;
  const types = typesOfCategory(challenge.categoryId);
  const clause = clauseImageSrc(challenge.categoryId) ? challenge.categoryId : undefined;
  return {
    title: category.title,
    ...(types && { types }),
    ...(clause && { clause }),
    short: category.short,
    note: category.note,
    cards: challenge.cards.map((id) => {
      const p = lookup(id)!;
      return { id, name: p.name, sprite: p.sprites.default };
    }),
    impostorCount: challenge.impostors.length,
  };
}

export const initialImpostorState = (mode: ImpostorMode): ImpostorPublicState => ({
  mode,
  status: "playing",
  decisions: [],
  selection: [],
  score: 0,
});

const invalid: ImpostorResponse = { ok: false, message: "Petición no válida." };

/**
 * Stateless replay (server). Normal mode: the selection is judged once, at CHECK
 * (every correct Pokémon and no impostor = win). One-by-one: decisions are judged
 * in board order and the first wrong one ends the game. The help reveals the
 * day's fixed help card (a correct Pokémon). Impostors are revealed only when
 * the game is over.
 */
export function playImpostor(challenge: ImpostorChallenge, input: unknown): ImpostorResponse {
  if (!input || typeof input !== "object") return invalid;
  const { mode, help, selection, decisions } = input as Record<string, unknown>;
  if (mode !== "normal" && mode !== "one-by-one") return invalid;
  if (typeof help !== "boolean") return invalid;
  const impostors = new Set(challenge.impostors);
  const state: ImpostorPublicState = { ...initialImpostorState(mode), ...(help ? { hintId: challenge.hintId } : {}) };

  if (mode === "normal") {
    if (decisions !== undefined) return invalid;
    if (selection === undefined) return { ok: true, state };
    if (!Array.isArray(selection) || selection.length > BOARD_SIZE) return invalid;
    if (selection.some((id) => !Number.isInteger(id) || !challenge.cards.includes(id)) || new Set(selection).size !== selection.length) {
      return invalid;
    }
    const chosen = new Set(selection as number[]);
    state.selection = challenge.cards.filter((id) => chosen.has(id));
    state.score = challenge.cards.filter((id) => chosen.has(id) !== impostors.has(id)).length;
    state.status = state.score === BOARD_SIZE ? "won" : "lost";
  } else {
    if (selection !== undefined) return invalid;
    if (decisions === undefined) return { ok: true, state };
    if (!Array.isArray(decisions) || decisions.length > BOARD_SIZE) return invalid;
    for (let i = 0; i < decisions.length; i++) {
      const d = decisions[i] as Verdict;
      if (d !== "correct" && d !== "impostor") return invalid;
      if (state.status !== "playing") return { ok: false, message: "La partida ha terminado." };
      state.decisions.push(d);
      if ((d === "impostor") !== impostors.has(challenge.cards[i])) state.status = "lost";
      else state.score++;
    }
    if (state.status === "playing" && state.decisions.length === BOARD_SIZE) state.status = "won";
  }

  if (state.status !== "playing") state.impostors = [...challenge.impostors];
  return { ok: true, state };
}
