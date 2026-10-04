import { toSummary } from "@/lib/pokemon/pokedex";
import type { Pokemon } from "@/lib/pokemon/types";
import { getQuartetCategory } from "./categories";
import { groupKey } from "./generator";
import {
  GROUP_SIZE,
  MAX_MISTAKES,
  type QuartetBoard,
  type QuartetGroup,
  type QuartetGuessResponse,
  type QuartetRevealResponse,
  type SolvedGroupView,
} from "./types";

type Lookup = (id: number) => Pokemon | undefined;

export function groupView(group: QuartetGroup, lookup: Lookup): SolvedGroupView {
  return {
    categoryId: group.categoryId,
    label: getQuartetCategory(group.categoryId)?.label ?? group.categoryId,
    tier: group.tier,
    pokemon: group.pokemonIds.map((id) => toSummary(lookup(id)!)),
  };
}

function isValidSelection(board: QuartetBoard, selection: unknown): selection is number[] {
  return (
    Array.isArray(selection) &&
    selection.length === GROUP_SIZE &&
    selection.every(Number.isInteger) &&
    new Set(selection).size === GROUP_SIZE &&
    selection.every((id) => board.layout.includes(id))
  );
}

/**
 * Checks one selection of 4 Pokémon. Pure (used by the server action and tests).
 * Only a fully correct selection reveals anything (that group's category).
 */
export function checkSelection(board: QuartetBoard, selection: unknown, lookup: Lookup): QuartetGuessResponse {
  if (!isValidSelection(board, selection)) return { ok: false, message: "Selecciona 4 Pokémon del tablero." };
  for (const group of board.groups) {
    const hits = selection.filter((id) => group.pokemonIds.includes(id)).length;
    if (hits === GROUP_SIZE) return { ok: true, result: "correct", group: groupView(group, lookup) };
  }
  const oneAway = board.groups.some((g) => selection.filter((id) => g.pokemonIds.includes(id)).length === GROUP_SIZE - 1);
  return { ok: true, result: oneAway ? "one-away" : "wrong" };
}

/**
 * Reveals every group after a loss. The client must present MAX_MISTAKES
 * distinct selections that are indeed wrong (the server is stateless, so this
 * is the proof that the game was lost).
 */
export function revealAfterLoss(board: QuartetBoard, wrongSelections: unknown, lookup: Lookup): QuartetRevealResponse {
  if (!Array.isArray(wrongSelections) || wrongSelections.length < MAX_MISTAKES) {
    return { ok: false, message: "La partida no ha terminado." };
  }
  const keys = new Set<string>();
  for (const selection of wrongSelections) {
    if (!isValidSelection(board, selection)) return { ok: false, message: "Petición no válida." };
    const result = checkSelection(board, selection, lookup);
    if (!result.ok || result.result === "correct") return { ok: false, message: "La partida no ha terminado." };
    keys.add(groupKey(selection));
  }
  if (keys.size < MAX_MISTAKES) return { ok: false, message: "La partida no ha terminado." };
  return { ok: true, groups: board.groups.map((g) => groupView(g, lookup)) };
}
