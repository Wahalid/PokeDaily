import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AccentBar } from "@/components/ui/AccentBar";
import { formatChallengeNumber, formatDisplayDate } from "@/lib/daily/calendar";
import { getTodaysQuartets, publicCards } from "@/lib/server/quartets-service";
import { QuartetsGame } from "@/features/quartets/components/QuartetsGame";

export const metadata: Metadata = {
  title: "Cuartetos",
  description: "Encuentra los 4 grupos de 4 Pokémon. Un nuevo reto cada día.",
};

export default async function QuartetsPage() {
  await connection(); // today's board depends on the request date
  const daily = getTodaysQuartets();
  // Only the 16 cards (in initial order) and an opaque progress key reach the client — never the groups.
  const cards = publicCards(daily);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-10 sm:pt-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-mist transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400"
      >
        ← Volver a los juegos
      </Link>

      <header className="mt-2 text-center sm:mt-3">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          CUAR<span className="text-sun-400">TETOS</span>
        </h1>
        <p className="mt-1 font-semibold">
          Cuartetos <span className="text-ember-300">{formatChallengeNumber(daily.number)}</span>
        </p>
        <p className="text-sm text-mist-dim">{formatDisplayDate(daily.date)}</p>
        <AccentBar className="mt-3" />
      </header>

      <div className="mt-4">
        {cards.length === 16 ? (
          <QuartetsGame challengeNumber={daily.number} progressKey={daily.progressKey} cards={cards} />
        ) : (
          <p className="mx-auto max-w-md rounded-2xl border border-ember-500/40 bg-ember-500/10 p-4 text-center font-semibold text-ember-300">
            El juego no está disponible en este momento.
          </p>
        )}
      </div>
    </div>
  );
}
