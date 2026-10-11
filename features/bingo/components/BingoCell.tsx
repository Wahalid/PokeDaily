import { ClauseBadge, hasClauseBadge } from "@/components/pokemon/ClauseBadge";
import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import { PokemonTypeBadge } from "@/components/pokemon/PokemonTypeBadge";
import type { BingoCellView } from "@/lib/bingo/types";
import { TYPE_LABELS } from "@/lib/pokemon/labels-es";
import { typesOfCategory } from "@/lib/pokemon/type-names";
import type { PokemonSummary } from "@/lib/pokemon/types";

export type CellFlash = "placed" | "wrong" | null;

/** One of the 16 condition cells. Empty cells are buttons while a card is in play. */
export function BingoCell({
  cell,
  pokemon,
  selected,
  playable,
  flash,
  error = false,
  finished,
  onSelect,
}: {
  cell: BingoCellView;
  pokemon: PokemonSummary | null;
  selected: boolean;
  playable: boolean;
  flash: CellFlash;
  /** The current Pokémon was already tried here and doesn't fit (no penalty; still clickable). */
  error?: boolean;
  finished: boolean;
  onSelect: () => void;
}) {
  // Type and dual-type cells show the type badges instead of the type names, and conditions shared
  // with Pokémon Grid (generations, Legendary, Starter…) its clause badges (presentation only).
  const types = typesOfCategory(cell.categoryId);
  const clause = !types && hasClauseBadge(cell.categoryId);
  const label = types ? (
    <span className="flex w-full flex-col items-center gap-0.5">
      {types.map((t) => (
        <PokemonTypeBadge key={t} type={t} alt={TYPE_LABELS[t]} size="sm" className="sm:w-[90px]" />
      ))}
    </span>
  ) : clause ? (
    <ClauseBadge id={cell.categoryId} alt={cell.short} size="sm" className="sm:w-[90px]" />
  ) : (
    <span className="max-w-full rounded-md px-1.5 py-0.5 text-center text-[10px] leading-tight font-black break-words text-white sm:text-xs">
      {cell.short}
    </span>
  );

  if (pokemon) {
    return (
      <div
        title={cell.label}
        aria-label={`${cell.label}: ${pokemon.name}`}
        className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-2xl border border-emerald-400/50 bg-gradient-to-b from-night-600 to-night-700 p-1 shadow-[0_0_0_1px_rgb(52_211_153/0.15),0_10px_24px_-12px_rgb(52_211_153/0.5)] ${
          flash === "placed" ? "animate-pop" : ""
        }`}
      >
        <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-emerald-500 text-[9px] text-white sm:size-5 sm:text-[11px]" aria-hidden>
          ✓
        </span>
        <PokemonSprite src={pokemon.sprite} name="" size={96} className="size-10 drop-shadow-[0_4px_6px_rgb(0_0_0/0.35)] sm:size-14" />
        <span className="w-full truncate text-center text-[9px] font-bold sm:text-xs">{pokemon.name}</span>
        {types ? (
          <span aria-hidden className="flex w-full justify-center gap-0.5">
            {types.map((t) => (
              <PokemonTypeBadge key={t} type={t} alt="" size="xs" className="min-w-0 sm:w-[72px]" />
            ))}
          </span>
        ) : clause ? (
          <ClauseBadge id={cell.categoryId} alt="" size="xs" className="min-w-0 sm:w-[72px]" />
        ) : (
          <span className="w-full truncate text-center text-[8px] font-semibold text-mist sm:text-[10px]">{cell.short}</span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      title={cell.label}
      aria-label={`${cell.label}${selected ? ", seleccionada" : ""}${error ? ", error: este Pokémon no encaja" : ""}${finished ? ", sin completar" : ""}`}
      aria-pressed={selected}
      disabled={!playable}
      onClick={onSelect}
      className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border p-1 transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400 disabled:cursor-default ${
        selected
          ? "-translate-y-1 border-sun-400 bg-night-600 shadow-[0_10px_24px_-10px_rgb(255_201_40/0.6)]"
          : finished
            ? "border-white/10 bg-night-800/50 opacity-60"
            : error
              ? "border-ember-500/70 bg-ember-500/10 enabled:hover:-translate-y-0.5"
            : "border-dashed border-brand-500/40 bg-night-700/70 enabled:hover:-translate-y-0.5 enabled:hover:border-brand-300/70 enabled:hover:bg-night-600"
      } ${flash === "wrong" ? "animate-shake border-ember-500 bg-ember-500/15" : ""}`}
    >
      {label}
      {error && !finished && <span className="rounded-full bg-ember-500 px-1.5 text-[9px] font-black tracking-wide text-white sm:text-[10px]">✗ ERROR</span>}
      {finished && <span className="text-[9px] font-semibold text-mist-dim uppercase">sin completar</span>}
    </button>
  );
}
