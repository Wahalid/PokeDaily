import { ResultActions } from "@/components/ui/ResultActions";
import { ResultPanel } from "@/components/ui/ResultPanel";
import { BOARD_SIZE } from "@/lib/impostor/types";
import type { PokemonType } from "@/lib/pokemon/types";
import { CategoryTitle } from "./CategoryTitle";

export function ImpostorResult({
  won,
  category,
  categoryTypes,
  categoryClause,
  score,
  correctFound,
  correctTotal,
  impostorNames,
  shareText,
}: {
  won: boolean;
  category: string;
  categoryTypes?: PokemonType[];
  categoryClause?: string;
  score: number;
  correctFound: number;
  correctTotal: number;
  impostorNames: string[];
  shareText: string;
}) {
  return (
    <ResultPanel tone={won ? "win" : "loss"} className="mt-6">
      <p className={`text-2xl font-black tracking-tight ${won ? "animate-pop" : ""}`}>
        {won ? "🎉 ¡HAS ENCONTRADO A LOS IMPOSTORES!" : "💀 ¡CAÍSTE EN LA TRAMPA!"}
      </p>
      <p className="mt-3 text-xs font-bold tracking-[0.2em] text-lavender uppercase">Categoría</p>
      <p className="mt-1 font-bold text-sun-300">
        <CategoryTitle title={category} types={categoryTypes} clause={categoryClause} />
      </p>
      <p className={`mt-2 text-5xl font-black tabular-nums ${won ? "text-sun-400" : "text-ember-300"}`}>
        {score}/{BOARD_SIZE}
      </p>
      <p className="mt-2 text-sm text-mist">
        {won ? (
          <>Encontraste los {correctTotal} correctos sin caer en ningún impostor.</>
        ) : (
          <>
            Correctos encontrados: <strong className="text-white">{correctFound}</strong>/{correctTotal}
          </>
        )}
      </p>
      {!won && (
        <p className="mt-2 text-sm text-mist">
          Impostores: <strong className="text-ember-300">{impostorNames.join(", ")}</strong>
        </p>
      )}
      <ResultActions lang="es" shareText={shareText} />
    </ResultPanel>
  );
}
