import { ResultActions } from "@/components/ui/ResultActions";
import { ResultPanel } from "@/components/ui/ResultPanel";
import { formatChallengeNumber } from "@/lib/daily/calendar";
import { CRY_ROUNDS } from "@/lib/cry/types";

export function CryResultPanel({ challengeNumber, score, squares, shareText }: { challengeNumber: number; score: number; squares: string[]; shareText: string }) {
  const perfect = score === CRY_ROUNDS;

  return (
    <ResultPanel tone={perfect ? "win" : "neutral"} className="mt-6">
      <p className="text-xs font-bold tracking-[0.2em] text-lavender uppercase">PokéCry {formatChallengeNumber(challengeNumber)}</p>
      <p className={`mt-1 text-2xl font-black tracking-tight ${perfect ? "animate-pop" : ""}`}>🎧 RESULTADO</p>
      <p className={`mt-2 text-5xl font-black tabular-nums ${perfect ? "text-sun-400" : score >= 3 ? "text-emerald-300" : "text-ember-300"}`}>
        {score}/{CRY_ROUNDS}
      </p>
      <p className="mt-2 text-2xl tracking-widest" aria-label={`${score} aciertos de ${CRY_ROUNDS}`}>
        {squares.join(" ")}
      </p>
      <p className="mt-2 text-sm text-mist">{perfect ? "¡Pleno! Oído de Maestro Pokémon." : score >= 3 ? "¡Buen oído!" : "Mañana, más cries."}</p>
      <ResultActions lang="es" shareText={shareText} />
    </ResultPanel>
  );
}
