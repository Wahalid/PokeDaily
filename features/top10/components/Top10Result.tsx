import { ResultActions } from "@/components/ui/ResultActions";
import { ResultPanel } from "@/components/ui/ResultPanel";
import { TOP_SIZE } from "@/lib/top10/types";
import type { Top10Stats } from "../progress";
import { Top10StatsPanel } from "./Top10Dialogs";

export function Top10Result({
  won,
  found,
  stats,
  shareText,
}: {
  /** true = ranking completed · false = given up. */
  won: boolean;
  found: number;
  stats: Top10Stats;
  shareText: string;
}) {
  return (
    <ResultPanel tone={won ? "win" : "loss"} className="mt-6">
      <p className={`text-2xl font-black tracking-tight ${won ? "animate-pop" : ""}`}>{won ? "🏆 TOP 10 COMPLETADO" : "🏳️ TOP 10 ABANDONADO"}</p>
      <p className={`mt-2 text-5xl font-black tabular-nums ${won ? "text-sun-400" : "text-ember-300"}`}>
        {found}/{TOP_SIZE}
      </p>
      {!won && <p className="mt-2 text-sm font-semibold text-mist">Te has rendido. Arriba tienes el ranking completo.</p>}
      <div className="mt-5">
        <Top10StatsPanel stats={stats} />
      </div>
      <ResultActions lang="es" shareText={shareText} />
    </ResultPanel>
  );
}
