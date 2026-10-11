import { ResultActions } from "@/components/ui/ResultActions";
import { ResultPanel } from "@/components/ui/ResultPanel";
import { CELL_COUNT } from "@/lib/grid/types";

export function GridComplete({
  filledCount,
  streak,
  shareText,
}: {
  filledCount: number;
  streak: number;
  shareText: string;
}) {
  return (
    <ResultPanel tone="win" className="mt-8">
      <p className="text-2xl font-black tracking-tight">🎉 GRID COMPLETE!</p>
      <p className="mt-2 text-5xl font-black text-sun-400 tabular-nums">
        {filledCount}/{CELL_COUNT}
      </p>
      {streak > 0 && <p className="mt-2 text-sm font-semibold text-ember-300">🔥 {streak} day streak</p>}
      <ResultActions lang="en" shareText={shareText} />
    </ResultPanel>
  );
}
