import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AccentBar } from "@/components/ui/AccentBar";
import { formatChallengeNumber, formatDisplayDate } from "@/lib/daily/calendar";
import { toGridView } from "@/lib/grid/engine";
import { gridKey } from "@/lib/grid/types";
import { getTodaysGrid } from "@/lib/server/grid-service";
import { GridGame } from "@/features/grid/components/GridGame";

export const metadata: Metadata = {
  title: "Pokémon Grid",
  description: "Complete all 9 cells with different Pokémon. A new grid every day.",
};

export default async function GridPage() {
  await connection(); // today's grid depends on the request date
  const daily = getTodaysGrid();

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-10 sm:pt-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-mist transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400"
      >
        ← Back to Games
      </Link>

      <header className="mt-3 text-center sm:mt-4">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          POKÉMON <span className="text-sun-400">GRID</span>
        </h1>
        <p className="mt-2 font-semibold">
          Daily Challenge <span className="text-ember-300">{formatChallengeNumber(daily.number)}</span>
        </p>
        <p className="text-sm text-mist-dim">{formatDisplayDate(daily.date)}</p>
        <AccentBar className="mt-4" />
        <p className="mx-auto mt-4 max-w-sm text-sm text-mist">Complete all 9 cells with different Pokémon.</p>
      </header>

      <div className="mt-6">
        <GridGame
          challengeNumber={daily.number}
          gridKey={gridKey(daily.definition)}
          grid={toGridView(daily.definition)}
        />
      </div>
    </div>
  );
}
