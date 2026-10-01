import type { ConditionView } from "./conditions/types";

export const GRID_SIZE = 3;
export const CELL_COUNT = GRID_SIZE * GRID_SIZE;

/** Storable definition of a grid: just condition ids. */
export interface GridDefinition {
  rows: string[];
  columns: string[];
}

/** Stable fingerprint of a grid's conditions (used to invalidate saved progress if a grid changes). */
export function gridKey(definition: GridDefinition): string {
  return `${definition.rows.join(",")}|${definition.columns.join(",")}`;
}

/** Cell index → (row, column). Cells are numbered row-major, 0..8. */
export function cellPosition(index: number): { row: number; column: number } {
  return { row: Math.floor(index / GRID_SIZE), column: index % GRID_SIZE };
}

export interface CellEvaluation {
  index: number;
  rowId: string;
  columnId: string;
  /** Ids of every Pokémon that satisfies both conditions. */
  answers: number[];
}

export interface GridEvaluation {
  definition: GridDefinition;
  cells: CellEvaluation[];
}

/** Client-safe grid description (no answers). */
export interface GridView {
  rows: ConditionView[];
  columns: ConditionView[];
}

export type AnswerRejection = "invalid-cell" | "unknown-pokemon" | "already-used" | "incorrect";

export type AnswerResult = { ok: true } | { ok: false; reason: AnswerRejection; message: string };
