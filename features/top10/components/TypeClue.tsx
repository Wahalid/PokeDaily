import { PokemonTypeBadge } from "@/components/pokemon/PokemonTypeBadge";
import { TYPE_LABELS } from "@/lib/pokemon/labels-es";
import type { PokemonType } from "@/lib/pokemon/types";

/** Type badges used as the per-position clue (both types for dual-type Pokémon). */
export function TypeClue({ types, compact = false }: { types: readonly PokemonType[]; compact?: boolean }) {
  return (
    <span
      className={`flex shrink-0 flex-col items-end gap-1 ${compact ? "" : "sm:flex-row sm:flex-wrap sm:justify-end"}`}
    >
      <span className="sr-only">Tipo:</span>
      {types.map((type) => (
        <PokemonTypeBadge
          key={type}
          type={type}
          alt={TYPE_LABELS[type]}
          size={compact ? "xs" : "sm"}
          className={compact ? "sm:w-[72px]" : ""}
        />
      ))}
    </span>
  );
}
