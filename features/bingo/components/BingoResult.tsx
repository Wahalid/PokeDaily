import { ResultActions } from "@/components/ui/ResultActions";
import { ResultPanel } from "@/components/ui/ResultPanel";
import { CELL_COUNT, type BingoEndReason } from "@/lib/bingo/types";
import type { BingoStats } from "../progress";
import { BingoStatsPanel } from "./BingoDialogs";

const REASONS: Record<BingoEndReason, string> = {
  complete: "Victoria",
};

export function BingoResult({
  won,
  filled,
  endReason,
  stats,
  shareText,
}: {
  won: boolean;
  filled: number;
  endReason: BingoEndReason;
  stats: BingoStats;
  shareText: string;
}) {
  return (
    <ResultPanel tone={won ? "win" : "loss"} className="mt-6">
      <p className={`text-2xl font-black tracking-tight ${won ? "animate-pop" : ""}`}>{won ? "🎯 ¡BINGO!" : "BINGO TERMINADO"}</p>
      <p className={`mt-2 text-5xl font-black tabular-nums ${won ? "text-sun-400" : "text-ember-300"}`}>
        {filled}/{CELL_COUNT}
      </p>
      <p className="mt-2 text-sm font-semibold text-mist">{REASONS[endReason]}</p>
      <div className="mt-5">
        <BingoStatsPanel stats={stats} />
      </div>
      <ResultActions lang="es" shareText={won ? shareText : undefined} />
    </ResultPanel>
  );
}
