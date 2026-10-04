import { readableTextOn, TYPE_COLORS } from "@/components/pokemon/type-colors";
import { TYPE_LABELS } from "@/lib/pokemon/labels-es";
import type { PokemonType } from "@/lib/pokemon/types";

/** Type chips used as the per-position clue (both types for dual-type Pokémon). */
export function TypeClue({ types, compact = false }: { types: readonly PokemonType[]; compact?: boolean }) {
  return (
    <span className="flex shrink-0 flex-wrap justify-end gap-1" aria-label={`Tipo: ${types.map((t) => TYPE_LABELS[t]).join(" y ")}`}>
      {types.map((type) => (
        <span
          key={type}
          className={`rounded-full font-bold shadow-sm ring-1 ring-white/20 ${compact ? "px-1.5 py-px text-[10px]" : "px-2 py-0.5 text-[11px] sm:text-xs"}`}
          style={{ backgroundColor: TYPE_COLORS[type], color: readableTextOn(TYPE_COLORS[type]) }}
        >
          {TYPE_LABELS[type]}
        </span>
      ))}
    </span>
  );
}
