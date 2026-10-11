import type { Metadata } from "next";
import { connection } from "next/server";
import { GamePage } from "@/components/layout/GamePage";
import { toGridView } from "@/lib/grid/engine";
import { gridKey } from "@/lib/grid/types";
import { getDailyGrid } from "@/lib/server/grid-service";
import { todayNumber } from "@/lib/server/test-day";
import { GridGame } from "@/features/grid/components/GridGame";

export const metadata: Metadata = {
  title: "Pokémon Grid",
  description: "Complete all 9 cells with different Pokémon. A new grid every day.",
};

export default async function GridPage() {
  await connection(); // today's grid depends on the request date
  const daily = getDailyGrid(await todayNumber());

  return (
    <GamePage
      lang="en"
      title="POKÉMON "
      accent="GRID"
      subtitle="Complete all 9 cells with different Pokémon."
      number={daily.number}
      date={daily.date}
    >
      <GridGame challengeNumber={daily.number} gridKey={gridKey(daily.definition)} grid={toGridView(daily.definition)} />
    </GamePage>
  );
}
