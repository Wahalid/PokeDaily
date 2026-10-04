import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import { TIERS, type SolvedGroupView } from "@/lib/quartets/types";
import { TIER_STYLES } from "../tier-styles";

/** A solved (or revealed) group: difficulty icon + label + category + its 4 Pokémon. */
export function SolvedGroup({ group, revealed = false }: { group: SolvedGroupView; revealed?: boolean }) {
  const tier = TIERS[group.tier];
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
        <span className="truncate text-sm font-black tracking-wide uppercase sm:text-base">{group.label}</span>
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
