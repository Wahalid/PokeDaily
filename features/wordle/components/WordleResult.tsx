import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import { ResultActions } from "@/components/ui/ResultActions";
import { ResultPanel } from "@/components/ui/ResultPanel";
import { MAX_ATTEMPTS } from "@/lib/wordle/types";

export function WordleResult({
  won,
  attempts,
  answer,
  shareText,
}: {
  won: boolean;
  attempts: number;
  answer: { name: string; sprites: string[] } | undefined;
  shareText: string;
}) {
  return (
    <ResultPanel tone={won ? "win" : "loss"}>
      <p className={`text-2xl font-black tracking-tight ${won ? "animate-pop" : ""}`}>
        {won ? "🎉 ¡POKÉMON ENCONTRADO!" : "😔 ¡Se acabaron los intentos!"}
      </p>
      {!won && <p className="mt-2 text-sm font-semibold text-mist">El Pokémon era:</p>}
      {answer && (
        <div className="mt-2 flex flex-col items-center">
          <div className="flex">
            {answer.sprites.map((src) => (
              <PokemonSprite key={src} src={src} name={answer.name} size={96} className="size-24" />
            ))}
          </div>
          <p className="text-xl font-black">{answer.name}</p>
        </div>
      )}
      <p className={`mt-2 text-5xl font-black tabular-nums ${won ? "text-sun-400" : "text-ember-300"}`}>
        {attempts}/{MAX_ATTEMPTS}
      </p>
      <ResultActions lang="es" shareText={shareText} />
    </ResultPanel>
  );
}
