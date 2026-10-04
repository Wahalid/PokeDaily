import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import type { PokemonType } from "@/lib/pokemon/types";
import { TOP_SIZE, type FoundEntry } from "@/lib/top10/types";
import { TypeClue } from "./TypeClue";

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * The 10 positions. Before a position is found, only its number and the
 * type clue are shown — never a name, Pokédex number or value.
 */
export function RankingList({
  clues,
  found,
  ranking,
  highlight,
}: {
  clues: ReadonlyArray<readonly PokemonType[]>;
  found: readonly FoundEntry[];
  /** Full ranking — only present once the game is over. */
  ranking?: readonly FoundEntry[];
  /** Position just discovered (animated). */
  highlight: number | null;
}) {
  const foundByPos = new Map(found.map((e) => [e.position, e]));
  return (
    <ol aria-label="Ranking Top 10" className="flex flex-col gap-1.5">
      {Array.from({ length: TOP_SIZE }, (_, i) => {
        const position = i + 1;
        const entry = foundByPos.get(position);
        const revealed = !entry ? ranking?.[i] : undefined;
        const shown = entry ?? revealed;
        const clue = clues[i] ?? [];
        return (
          <li
            key={position}
            className={`flex min-h-12 items-center gap-2 rounded-2xl border px-2.5 py-1.5 sm:gap-3 sm:px-3 ${
              entry
                ? `border-emerald-400/50 bg-gradient-to-r from-emerald-500/15 to-night-700 ${highlight === position ? "animate-pop" : ""}`
                : revealed
                  ? "border-white/10 bg-night-800/60 opacity-80"
                  : "border-dashed border-brand-500/30 bg-night-800/50"
            }`}
            aria-label={
              shown
                ? `Puesto ${position}: ${shown.pokemon.name}, ${shown.value}${revealed ? ", revelado" : ""}`
                : `Puesto ${position}: sin descubrir`
            }
          >
            <span
              className={`grid h-8 w-11 shrink-0 place-items-center rounded-full text-xs font-black tabular-nums ${
                position <= 3 ? "bg-sun-400/15 text-sun-300 ring-1 ring-sun-400/40" : "bg-night-600 text-mist"
              }`}
            >
              {MEDALS[i] ? <span aria-hidden>{MEDALS[i]}</span> : null}#{position}
            </span>
            {shown ? (
              <>
                <PokemonSprite src={shown.pokemon.sprite} name="" size={48} className="size-9 shrink-0 sm:size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold sm:text-base">{shown.pokemon.name}</span>
                  <span className="block font-mono text-[11px] text-mist tabular-nums">
                    {shown.value}
                    {revealed && <span className="ml-1.5 font-sans font-semibold text-mist-dim uppercase">· revelado</span>}
                  </span>
                </span>
              </>
            ) : (
              <span className="flex-1 text-lg font-bold text-brand-300/40" aria-hidden>
                ❓
              </span>
            )}
            <TypeClue types={clue} compact />
          </li>
        );
      })}
    </ol>
  );
}
