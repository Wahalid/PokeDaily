import { ClauseBadge } from "@/components/pokemon/ClauseBadge";
import { PokemonTypeBadge } from "@/components/pokemon/PokemonTypeBadge";
import { TYPE_LABELS } from "@/lib/pokemon/labels-es";
import type { PokemonType } from "@/lib/pokemon/types";

/**
 * The category title. For a type category the type names become badges and the
 * rest of the sentence stays as text: "Pokémon de tipo" over "[Agua] (y [Planta])".
 * A category shared with Pokémon Grid shows its clause badge above the title,
 * which stays as written (it carries the exact rule, e.g. "(o sus evoluciones)").
 */
export function CategoryTitle({
  title,
  types,
  clause,
  size = "md",
}: {
  title: string;
  types?: PokemonType[];
  clause?: string;
  size?: "md" | "lg";
}) {
  if (clause && !types?.length) {
    return (
      <span className="flex flex-col items-center gap-1.5">
        <ClauseBadge id={clause} alt="" size={size} />
        <span>{title}</span>
      </span>
    );
  }
  if (!types?.length) return <>{title}</>;
  return (
    <span className="flex flex-col items-center gap-1.5">
      <span>Pokémon de tipo</span>
      <span className="flex flex-wrap items-center justify-center gap-2">
        {types.map((t, i) => (
          <span key={t} className="flex items-center gap-2">
            {i > 0 && <span>y</span>}
            <PokemonTypeBadge type={t} alt={TYPE_LABELS[t]} size={size} />
          </span>
        ))}
      </span>
    </span>
  );
}
