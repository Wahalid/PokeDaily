import { ClauseBadge, hasClauseBadge } from "@/components/pokemon/ClauseBadge";
import { PokemonTypeBadge } from "@/components/pokemon/PokemonTypeBadge";
import type { ConditionView } from "@/lib/grid/conditions/types";

/**
 * Renders any Grid condition generically as a compact annotation; uses
 * presentation hints from `meta`. Row labels read vertically below `md`
 * (slim gutter beside the board) and horizontally from `md` up. Type
 * conditions show the type badge; the others show their badge from
 * public/pokemon_grid_clauses/ (ClauseBadge), or text if none exists.
 */
export function ConditionLabel({ condition, axis }: { condition: ConditionView; axis: "row" | "column" }) {
  const type = condition.meta?.pokemonType as string | undefined;
  const clause = !type && hasClauseBadge(condition.id);
  const row = axis === "row";

  return (
    <div
      title={condition.description}
      className={`flex min-h-0 min-w-0 flex-col gap-1 ${
        row ? "items-center justify-center md:items-end md:text-right" : "items-center justify-end text-center"
      }`}
    >
      <span
        className={`text-[10px] leading-none font-semibold tracking-wider text-mist-dim/80 uppercase ${row ? "hidden md:block" : "hidden sm:block"}`}
      >
        {condition.categoryLabel}
      </span>
      {type ? (
        row ? (
          <>
            {/* Phones: the badge is turned to read bottom-to-top, like the other row labels. */}
            <span className="relative h-[72px] w-4 shrink-0 md:hidden">
              <PokemonTypeBadge
                type={type}
                alt={condition.label}
                className="absolute top-1/2 left-1/2 max-w-none -translate-1/2 -rotate-90"
                size="sm"
              />
            </span>
            <PokemonTypeBadge type={type} alt={condition.label} className="hidden md:block" />
          </>
        ) : (
          <PokemonTypeBadge type={type} alt={condition.label} size="sm" className="sm:w-[90px]" />
        )
      ) : clause ? (
        // Same 9:2 badges as the types, a little larger where there is room: their text is longer.
        row ? (
          <>
            <span className="relative h-[78px] w-[18px] shrink-0 md:hidden">
              <ClauseBadge id={condition.id} alt={condition.label} className="absolute top-1/2 left-1/2 w-[78px] max-w-none -translate-1/2 -rotate-90" />
            </span>
            <ClauseBadge id={condition.id} alt={condition.label} className="hidden w-28 md:block" />
          </>
        ) : (
          <ClauseBadge id={condition.id} alt={condition.label} className="w-[90px] sm:w-[126px]" />
        )
      ) : (
        <span
          className={`max-w-full rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] leading-tight font-semibold text-mist ring-1 ring-white/10 sm:text-xs ${
            row ? "max-h-full max-md:rotate-180 max-md:px-0.5 max-md:py-2 max-md:[writing-mode:vertical-rl]" : ""
          }`}
        >
          {condition.label}
        </span>
      )}
    </div>
  );
}
