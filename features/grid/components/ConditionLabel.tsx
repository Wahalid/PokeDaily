import { readableTextOn, TYPE_COLORS } from "@/components/pokemon/type-colors";
import type { ConditionView } from "@/lib/grid/conditions/types";
import type { PokemonType } from "@/lib/pokemon/types";

/** Renders any Grid condition generically; uses presentation hints from `meta`. */
export function ConditionLabel({ condition, axis }: { condition: ConditionView; axis: "row" | "column" }) {
  const typeColor = condition.meta?.pokemonType
    ? TYPE_COLORS[condition.meta.pokemonType as PokemonType]
    : undefined;

  return (
    <div
      title={condition.description}
      className={`flex h-full flex-col justify-center gap-1 ${
        axis === "column" ? "items-center pb-2 text-center" : "items-end pr-2 text-right sm:pr-3"
      }`}
    >
      <span className="hidden text-[10px] font-semibold tracking-wider text-mist-dim uppercase sm:block">
        {condition.categoryLabel}
      </span>
      {typeColor ? (
        <span
          className="max-w-full rounded-xl px-2 py-1 text-[11px] leading-tight font-bold hyphens-auto shadow-sm ring-1 ring-white/20 sm:rounded-full sm:px-2.5 sm:text-sm"
          style={{ backgroundColor: typeColor, color: readableTextOn(typeColor) }}
        >
          {condition.label}
        </span>
      ) : (
        <span className="max-w-full rounded-xl bg-night-700 px-2 py-1 text-[11px] leading-tight font-bold hyphens-auto text-white ring-1 ring-brand-300/30 sm:rounded-full sm:px-2.5 sm:text-sm">
          {condition.label}
        </span>
      )}
    </div>
  );
}
