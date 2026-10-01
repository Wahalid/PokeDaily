import type { Pokemon } from "@/lib/pokemon/types";
import { getCondition, toConditionView } from "./conditions/registry";
import type { GridCondition } from "./conditions/types";
import {
  CELL_COUNT,
  cellPosition,
  type AnswerResult,
  type CellEvaluation,
  type GridDefinition,
  type GridEvaluation,
  type GridView,
} from "./types";

/**
 * Grid engine: pure functions that evaluate conditions against Pokémon.
 * Knows nothing about UI, dates or storage.
 */

export function resolveCell(definition: GridDefinition, index: number): [GridCondition, GridCondition] | null {
  if (!Number.isInteger(index) || index < 0 || index >= CELL_COUNT) return null;
  const { row, column } = cellPosition(index);
  return [getCondition(definition.rows[row]), getCondition(definition.columns[column])];
}

export function satisfiesCell(definition: GridDefinition, index: number, pokemon: Pokemon): boolean {
  const cell = resolveCell(definition, index);
  return cell !== null && cell[0].test(pokemon) && cell[1].test(pokemon);
}

export function evaluateGrid(definition: GridDefinition, pokemon: readonly Pokemon[]): GridEvaluation {
  const rowMatches = definition.rows.map((id) => new Set(pokemon.filter(getCondition(id).test).map((p) => p.id)));
  const columnConditions = definition.columns.map(getCondition);

  const cells: CellEvaluation[] = [];
  for (let index = 0; index < CELL_COUNT; index++) {
    const { row, column } = cellPosition(index);
    const answers = pokemon
      .filter((p) => rowMatches[row].has(p.id) && columnConditions[column].test(p))
      .map((p) => p.id);
    cells.push({ index, rowId: definition.rows[row], columnId: definition.columns[column], answers });
  }
  return { definition, cells };
}

/**
 * True if every cell can be filled with a DIFFERENT Pokémon at the same time
 * (bipartite matching cells ↔ Pokémon, Kuhn's algorithm).
 */
export function hasDistinctSolution(cellAnswers: number[][]): boolean {
  const owner = new Map<number, number>(); // pokemonId → cell index

  const tryAssign = (cell: number, visited: Set<number>): boolean => {
    for (const id of cellAnswers[cell]) {
      if (visited.has(id)) continue;
      visited.add(id);
      const current = owner.get(id);
      if (current === undefined || tryAssign(current, visited)) {
        owner.set(id, cell);
        return true;
      }
    }
    return false;
  };

  return cellAnswers.every((_, cell) => tryAssign(cell, new Set()));
}

export function validateAnswer(params: {
  definition: GridDefinition;
  cellIndex: number;
  pokemon: Pokemon | undefined;
  usedPokemonIds: readonly number[];
}): AnswerResult {
  const { definition, cellIndex, pokemon, usedPokemonIds } = params;
  const cell = resolveCell(definition, cellIndex);
  if (!cell) return { ok: false, reason: "invalid-cell", message: "That cell doesn't exist." };
  if (!pokemon) return { ok: false, reason: "unknown-pokemon", message: "Unknown Pokémon." };
  if (usedPokemonIds.includes(pokemon.id)) {
    return { ok: false, reason: "already-used", message: "This Pokémon has already been used." };
  }
  const [row, column] = cell;
  if (!row.test(pokemon) || !column.test(pokemon)) {
    return {
      ok: false,
      reason: "incorrect",
      message: `${pokemon.name} isn't ${row.label} + ${column.label}. Try another one!`,
    };
  }
  return { ok: true };
}

export function toGridView(definition: GridDefinition): GridView {
  return {
    rows: definition.rows.map((id) => toConditionView(getCondition(id))),
    columns: definition.columns.map((id) => toConditionView(getCondition(id))),
  };
}
