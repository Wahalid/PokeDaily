import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AccentBar } from "@/components/ui/AccentBar";
import { formatChallengeNumber, formatDisplayDate } from "@/lib/daily/calendar";
import { getPokedex } from "@/lib/pokemon/repository";
import { getTodaysTop10 } from "@/lib/server/top10-service";
import { criterionView, initialTop10State } from "@/lib/top10/play";
import { Top10Game } from "@/features/top10/components/Top10Game";

export const metadata: Metadata = {
  title: "Top 10",
  description: "Descubre los 10 Pokémon que encabezan el ranking del día. Un nuevo Top 10 cada día.",
};

export default async function Top10Page() {
  await connection(); // today's challenge depends on the request date
  const daily = getTodaysTop10();
  const pokedex = getPokedex();
  // The client only gets the visible criterion and the type clue of each position — never the ranking.

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
          TOP <span className="text-sun-400">10</span>
        </h1>
        <p className="mt-1 font-semibold">
          Top 10 <span className="text-ember-300">{formatChallengeNumber(daily.number)}</span>
        </p>
        <p className="text-sm text-mist-dim">{formatDisplayDate(daily.date)}</p>
        <AccentBar className="mt-3" />
      </header>

      <div className="mt-4">
        {daily.challenge ? (
          <Top10Game
            challengeNumber={daily.number}
            progressKey={daily.progressKey}
            criterion={criterionView(daily.challenge)}
            initialState={initialTop10State(daily.challenge, (id) => pokedex.getById(id))}
          />
        ) : (
          <p className="mx-auto max-w-md rounded-2xl border border-ember-500/40 bg-ember-500/10 p-4 text-center font-semibold text-ember-300">
            El juego no está disponible en este momento.
          </p>
        )}
      </div>
    </div>
  );
}
