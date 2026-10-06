import { toSummary } from "@/lib/pokemon/pokedex";
import type { Pokemon } from "@/lib/pokemon/types";
import { getQuartetCategory } from "./categories";
import {
  GROUP_SIZE,
  type QuartetBoard,
  type QuartetGroup,
  type QuartetGuessResponse,
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
