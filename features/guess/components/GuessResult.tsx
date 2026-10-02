import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import { AccentBar } from "@/components/ui/AccentBar";
import { ButtonLink } from "@/components/ui/Button";
import { MAX_GUESSES } from "@/lib/guess/types";
import { formatDexNumber } from "@/lib/pokemon/format";
import type { PokemonSummary } from "@/lib/pokemon/types";

/** End-of-game panel: victory or defeat with the secret Pokémon revealed. */
export function GuessResult({ won, attempts, answer }: { won: boolean; attempts: number; answer: PokemonSummary }) {
  return (
    <section
      aria-live="polite"
      className={`relative mx-auto mt-6 max-w-md animate-fade-up overflow-hidden rounded-3xl border bg-gradient-to-b from-night-700 to-night-800 p-6 text-center ${
        won
          ? "border-sun-400/30 shadow-[0_20px_60px_-20px_rgb(255_201_40/0.35)]"
          : "border-ember-500/30 shadow-[0_20px_60px_-20px_rgb(229_72_77/0.35)]"
      }`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute -top-20 left-1/2 size-56 -translate-x-1/2 rounded-full blur-3xl ${
          won ? "bg-sun-400/15" : "bg-ember-500/15"
        }`}
      />
      <div className="relative">
        <p className="text-2xl font-black tracking-tight">{won ? "🎉 ¡Correcto!" : "❌ ¡Se acabaron los intentos!"}</p>
        {!won && <p className="mt-3 text-sm font-semibold text-mist">El Pokémon era:</p>}

        <div className="mt-3 flex flex-col items-center">
          <PokemonSprite
            src={answer.sprite}
            name={answer.name}
            size={96}
            className="size-24 animate-pop drop-shadow-[0_6px_10px_rgb(0_0_0/0.4)]"
          />
          <p className="mt-1 text-xl font-black">{answer.name}</p>
          <p className="font-mono text-xs text-mist-dim">{formatDexNumber(answer.dexNumber)}</p>
        </div>

        {won && (
          <p className="mt-3 text-lg font-bold text-sun-400 tabular-nums">
            Intentos: {attempts}/{MAX_GUESSES}
          </p>
        )}
        <AccentBar className="mt-4" />
        <div className="mt-5 flex justify-center">
          <ButtonLink href="/" variant="secondary">
            Volver a los juegos
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
