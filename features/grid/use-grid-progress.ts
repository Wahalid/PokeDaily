import { useMemo } from "react";
import { CELL_COUNT } from "@/lib/grid/types";
import type { PokemonSummary } from "@/lib/pokemon/types";
import { useLocalStorage } from "@/lib/storage/local-store";

export type GridCells = ReadonlyArray<PokemonSummary | null>;

interface StoredProgress {
  /** Fingerprint of the grid these answers belong to. */
  gridKey?: string;
  cells: GridCells;
}

const EMPTY: StoredProgress = { cells: Array<PokemonSummary | null>(CELL_COUNT).fill(null) };

/**
 * Player progress for one daily Grid, persisted in localStorage.
 * Progress saved for a different grid (e.g. after a data update changed
 * the challenge) is ignored rather than shown under the wrong conditions.
 */
export function useGridProgress(challengeNumber: number, gridKey: string) {
  const [stored, setStored] = useLocalStorage<StoredProgress>(`pokedaily:grid:${challengeNumber}`, EMPTY);
  const valid = stored.gridKey === gridKey && stored.cells?.length === CELL_COUNT;
  const cells = valid ? stored.cells : EMPTY.cells;

  const usedIds = useMemo(() => cells.filter((c): c is PokemonSummary => c !== null).map((c) => c.id), [cells]);

  const fillCell = (index: number, pokemon: PokemonSummary): GridCells => {
    const next = [...cells];
    next[index] = pokemon;
    setStored({ gridKey, cells: next });
    return next;
  };

  return { cells, usedIds, filledCount: usedIds.length, fillCell };
}
