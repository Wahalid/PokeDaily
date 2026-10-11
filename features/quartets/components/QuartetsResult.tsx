import { ResultActions } from "@/components/ui/ResultActions";
import { ResultPanel } from "@/components/ui/ResultPanel";
import type { QuartetsStats } from "../use-quartets-progress";
import { StatsPanel } from "./QuartetsDialogs";

/** End-of-game panel (the groups themselves are shown above it). */
export function QuartetsResult({
  won,
  mistakes,
  stats,
  shareText,
}: {
  won: boolean;
  mistakes: number;
  stats: QuartetsStats;
  shareText: string;
}) {
  return (
    <ResultPanel tone={won ? "win" : "loss"} className="mt-6">
      <p className={`text-2xl font-black tracking-tight ${won ? "animate-pop" : ""}`}>{won ? "🎉 ¡POKÉMON GROUPS COMPLETADO!" : "¡Mañana más!"}</p>
      <p className="mt-2 text-sm font-semibold text-mist">
        {won ? "Has encontrado los 4 grupos" : "Estos eran los 4 grupos"} · {mistakes} {mistakes === 1 ? "error" : "errores"}
      </p>
      <div className="mt-5">
        <StatsPanel stats={stats} />
      </div>
      <ResultActions lang="es" shareText={shareText} />
    </ResultPanel>
  );
}
