import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import type { PokemonSummary } from "@/lib/pokemon/types";

export type CardState = "idle" | "selected" | "wrong";

/** One Pokémon card of the 4×4 board (a toggle button). */
export function QuartetCard({
  pokemon,
  state,
  disabled,
  onToggle,
}: {
  pokemon: PokemonSummary;
  state: CardState;
  disabled: boolean;
  onToggle: () => void;
}) {
  const selected = state !== "idle";
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${pokemon.name}${selected ? ", seleccionado" : ""}`}
      disabled={disabled}
      onClick={onToggle}
      className={`flex aspect-[4/5] min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl border p-1 transition duration-150 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400 disabled:cursor-default sm:aspect-square sm:p-2 ${
        selected
          ? "-translate-y-1 border-sun-400 bg-night-600 shadow-[0_10px_24px_-10px_rgb(255_201_40/0.6)]"
          : "border-brand-500/30 bg-night-700/80 shadow-[0_8px_20px_-12px_rgb(0_0_0/0.6)] enabled:hover:-translate-y-0.5 enabled:hover:border-brand-300/60 enabled:hover:bg-night-600"
      } ${state === "wrong" ? "animate-shake" : ""}`}
    >
      <PokemonSprite src={pokemon.sprite} name="" size={96} className="size-12 drop-shadow-[0_4px_6px_rgb(0_0_0/0.35)] sm:size-16" />
      <span className={`w-full truncate text-center text-[10px] leading-tight font-bold sm:text-xs ${selected ? "text-sun-300" : "text-white"}`}>
        {pokemon.name}
      </span>
    </button>
  );
}
