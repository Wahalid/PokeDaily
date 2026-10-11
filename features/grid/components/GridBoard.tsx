import { GRID_SIZE, type GridView } from "@/lib/grid/types";
import type { GridCells } from "../use-grid-progress";
import { ConditionLabel } from "./ConditionLabel";
import { GridCell } from "./GridCell";

/**
 * The 3×3 board is centered on its own; the conditions are annotations around
 * it and never take part in that centering:
 * - column conditions sit in a row above the board, sharing its width and gaps;
 * - row conditions are positioned outside the board, to its left (right-full),
 *   in a 3-row grid aligned with the cells. Below `md` they turn into slim
 *   vertical labels inside a symmetric gutter, so the board stays centered and
 *   barely shrinks on phones.
 */
export function GridBoard({
  grid,
  cells,
  activeCell,
  justFilledCell,
  onSelectCell,
}: {
  grid: GridView;
  cells: GridCells;
  activeCell: number | null;
  justFilledCell: number | null;
  onSelectCell: (index: number) => void;
}) {
  return (
    <div className="px-[2.125rem] md:px-0">
      <div className="mx-auto max-w-[27.75rem]">
        <div className="grid grid-cols-3 gap-2 pb-2 sm:gap-3">
          {grid.columns.map((c) => (
            <ConditionLabel key={c.id} condition={c} axis="column" />
          ))}
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 right-full mr-1.5 grid w-7 grid-rows-3 gap-2 sm:gap-3 md:mr-3 md:w-28">
            {grid.rows.map((r) => (
              <ConditionLabel key={r.id} condition={r} axis="row" />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
              const row = grid.rows[Math.floor(index / GRID_SIZE)];
              const column = grid.columns[index % GRID_SIZE];
              return (
                <GridCell
                  key={index}
                  pokemon={cells[index]}
                  label={`${row.label} × ${column.label}`}
                  active={activeCell === index}
                  justFilled={justFilledCell === index}
                  onSelect={() => onSelectCell(index)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
