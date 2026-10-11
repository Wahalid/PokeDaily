import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import { ResultActions } from "@/components/ui/ResultActions";
import { ResultPanel } from "@/components/ui/ResultPanel";
import { MAX_GUESSES } from "@/lib/guess/types";
import { formatDexNumber } from "@/lib/pokemon/format";
import type { PokemonSummary } from "@/lib/pokemon/types";

/** End-of-game panel: victory or defeat with the secret Pokémon revealed. */
export function GuessResult({ won, attempts, answer }: { won: boolean; attempts: number; answer: PokemonSummary }) {
  return (
    <ResultPanel tone={won ? "win" : "loss"} className="mt-6">
      <p className="text-2xl font-black tracking-tight">{won ? "🎉 ¡Correcto!" : "❌ ¡Se acabaron los intentos!"}</p>
      {!won && <p className="mt-2 text-sm font-semibold text-mist">El Pokémon era:</p>}

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
      <ResultActions lang="es" />
    </ResultPanel>
  );
}
