import { ClauseBadge, hasClauseBadge } from "@/components/pokemon/ClauseBadge";
import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import { PokemonTypeBadge } from "@/components/pokemon/PokemonTypeBadge";
import { TYPE_LABELS } from "@/lib/pokemon/labels-es";
import { typesOfCategory } from "@/lib/pokemon/type-names";
import { TIERS, type SolvedGroupView } from "@/lib/quartets/types";
import { TIER_STYLES } from "../tier-styles";

/** A solved (or revealed) group: difficulty icon + label + category + its 4 Pokémon. */
export function SolvedGroup({ group, revealed = false }: { group: SolvedGroupView; revealed?: boolean }) {
  const tier = TIERS[group.tier];
  const types = typesOfCategory(group.categoryId);
  return (
    <li
      className={`animate-pop rounded-2xl border px-3 py-2.5 ${TIER_STYLES[group.tier].bar} ${revealed ? "opacity-80" : ""}`}
      aria-label={`${group.label} (${tier.label}${revealed ? ", revelado" : ""}): ${group.pokemon.map((p) => p.name).join(", ")}`}
    >
      <div className="flex items-center justify-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${TIER_STYLES[group.tier].chip}`}>
          <span aria-hidden>{tier.icon}</span>
          {tier.label}
        </span>
        {types ? (
          // "Tipo Agua" / "Tipo Agua y Planta": the badges replace the type names.
          <span className="flex min-w-0 items-center gap-1">
            {types.map((t) => (
              <PokemonTypeBadge key={t} type={t} alt={TYPE_LABELS[t]} size="sm" className="min-w-0 sm:w-[90px]" />
            ))}
          </span>
        ) : hasClauseBadge(group.categoryId) ? (
          // Conditions shared with Pokémon Grid (generations, Legendary, Starter…) use its clause badge.
          <ClauseBadge id={group.categoryId} alt={group.label} size="md" className="min-w-0 sm:w-[117px]" />
        ) : (
          <span className="truncate text-sm font-black tracking-wide uppercase sm:text-base">{group.label}</span>
        )}
        {revealed && <span className="text-[10px] font-semibold text-mist uppercase">· revelado</span>}
      </div>
      <ul className="mt-1.5 grid grid-cols-4 gap-1">
        {group.pokemon.map((p) => (
          <li key={p.id} className="flex min-w-0 flex-col items-center">
            <PokemonSprite src={p.sprite} name="" size={48} className="size-9 sm:size-10" />
            <span className="w-full truncate text-center text-[10px] font-semibold sm:text-xs">{p.name}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}
