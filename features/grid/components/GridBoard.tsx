import { Fragment } from "react";
import { cellPosition, GRID_SIZE, type GridView } from "@/lib/grid/types";
import type { GridCells } from "../use-grid-progress";
import { ConditionLabel } from "./ConditionLabel";
import { GridCell } from "./GridCell";

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
    // Label column keeps a minimum width so row labels never clip on small phones.
    <div className="grid grid-cols-[minmax(5rem,0.85fr)_repeat(3,minmax(0,1fr))] gap-2 sm:gap-3">
      <div aria-hidden />
      {grid.columns.map((c) => (
        <ConditionLabel key={c.id} condition={c} axis="column" />
      ))}

      {grid.rows.map((row, r) => (
        <Fragment key={row.id}>
          <ConditionLabel condition={row} axis="row" />
          {Array.from({ length: GRID_SIZE }, (_, c) => {
            const index = r * GRID_SIZE + c;
            const { column } = cellPosition(index);
            return (
              <GridCell
                key={index}
                pokemon={cells[index]}
                label={`${row.label} × ${grid.columns[column].label}`}
                active={activeCell === index}
                justFilled={justFilledCell === index}
                onSelect={() => onSelectCell(index)}
              />
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
