"use client";

import { useCallback, useState } from "react";
import { CELL_COUNT, cellPosition, type GridView } from "@/lib/grid/types";
import type { PokemonSummary } from "@/lib/pokemon/types";
import { recordCompletion, useStreak } from "@/lib/storage/streaks";
import { submitGridAnswer } from "../actions";
import { buildShareText } from "../share";
import { useGridProgress } from "../use-grid-progress";
import { AnswerDialog } from "./AnswerDialog";
import { GridBoard } from "./GridBoard";
import { GridComplete } from "./GridComplete";

/** Interactive daily Grid: board + answer picker + progress + completion. */
export function GridGame({
  challengeNumber,
  gridKey,
  grid,
}: {
  challengeNumber: number;
  gridKey: string;
  grid: GridView;
}) {
  const { cells, usedIds, filledCount, fillCell } = useGridProgress(challengeNumber, gridKey);
  const streak = useStreak("grid", challengeNumber);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [justFilled, setJustFilled] = useState<number | null>(null);
  const complete = filledCount === CELL_COUNT;

  const closeDialog = useCallback(() => setActiveCell(null), []);

  const answer = async (index: number, pokemon: PokemonSummary) => {
    const result = await submitGridAnswer({
      challengeNumber,
      cellIndex: index,
      pokemonId: pokemon.id,
      usedPokemonIds: usedIds,
    });
    if (result.ok) {
      const next = fillCell(index, pokemon);
      setJustFilled(index);
      setActiveCell(null);
      if (next.every(Boolean)) recordCompletion("grid", challengeNumber);
    }
    return result;
  };

  const active = activeCell === null ? null : cellPosition(activeCell);

  return (
    <div>
      <Progress filled={filledCount} />

      <div className="mx-auto mt-4 max-w-xl">
        <GridBoard
          grid={grid}
          cells={cells}
          activeCell={activeCell}
          justFilledCell={justFilled}
          onSelectCell={setActiveCell}
        />
      </div>

      {complete && (
        <GridComplete
          filledCount={filledCount}
          streak={streak}
          shareText={buildShareText({ challengeNumber, filled: cells.map(Boolean), streak })}
        />
      )}

      {activeCell !== null && active && (
        <AnswerDialog
          key={activeCell}
          row={grid.rows[active.row]}
          column={grid.columns[active.column]}
          usedIds={usedIds}
          onClose={closeDialog}
          onAnswer={(pokemon) => answer(activeCell, pokemon)}
        />
      )}
    </div>
  );
}

function Progress({ filled }: { filled: number }) {
  const percent = (filled / CELL_COUNT) * 100;
  return (
    <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
      <p className="text-sm font-semibold text-mist tabular-nums">
        <span className="text-white">{filled}</span> / {CELL_COUNT} completed
      </p>
      <div
        role="progressbar"
        aria-label="Cells completed"
        aria-valuemin={0}
        aria-valuemax={CELL_COUNT}
        aria-valuenow={filled}
        className="h-2 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10"
      >
        {/* Gradient spans the full track; the fill reveals it progressively. */}
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 via-sun-400 to-ember-500 transition-[width] duration-500"
          style={{ width: `${percent}%`, backgroundSize: percent > 0 ? `${(100 / percent) * 100}% 100%` : undefined }}
        />
      </div>
    </div>
  );
}
