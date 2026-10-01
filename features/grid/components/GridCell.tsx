import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import type { PokemonSummary } from "@/lib/pokemon/types";

export function GridCell({
  pokemon,
  label,
  active,
  justFilled,
  onSelect,
}: {
  pokemon: PokemonSummary | null;
  label: string;
  active: boolean;
  justFilled: boolean;
  onSelect: () => void;
}) {
  if (pokemon) {
    return (
      <div
        aria-label={`${label}: ${pokemon.name}`}
        className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl border border-brand-300/40 bg-gradient-to-b from-night-600 to-night-700 p-1 shadow-[0_0_0_1px_rgb(61_99_240/0.15),0_10px_28px_-10px_rgb(61_99_240/0.55)] ${
          justFilled ? "animate-pop" : ""
        }`}
      >
        <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-emerald-500 text-[10px] text-white shadow sm:size-5 sm:text-xs">
          ✓
        </span>
        <PokemonSprite
          src={pokemon.sprite}
          name={pokemon.name}
          size={96}
          className="size-14 drop-shadow-[0_4px_6px_rgb(0_0_0/0.35)] sm:size-20"
        />
        <span className="w-full truncate px-1 text-center text-[11px] font-semibold text-white sm:text-sm">
          {pokemon.name}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${label}: empty, choose a Pokémon`}
      className={`group grid aspect-square place-items-center rounded-2xl border bg-night-700/80 shadow-[0_8px_20px_-12px_rgb(0_0_0/0.6)] transition duration-150 hover:-translate-y-0.5 hover:border-brand-300/70 hover:bg-night-600 hover:shadow-[0_12px_28px_-12px_rgb(61_99_240/0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400 ${
        active ? "border-sun-400/80 bg-night-600" : "border-brand-500/35"
      }`}
    >
      <span className="text-3xl font-bold text-brand-300/50 transition group-hover:scale-110 group-hover:text-brand-300 sm:text-4xl">
        ?
      </span>
    </button>
  );
}
