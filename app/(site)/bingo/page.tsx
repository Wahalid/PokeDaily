import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AccentBar } from "@/components/ui/AccentBar";
import { cellViews, playBingo } from "@/lib/bingo/play";
import { formatChallengeNumber, formatDisplayDate } from "@/lib/daily/calendar";
import { getPokedex } from "@/lib/pokemon/repository";
import { getTodaysBingo } from "@/lib/server/bingo-service";
import { BingoGame } from "@/features/bingo/components/BingoGame";

export const metadata: Metadata = {
  title: "PokéBingo",
  description: "Coloca cada Pokémon en la casilla correcta y completa el tablero. Un nuevo PokéBingo cada día.",
};

export default async function BingoPage() {
  await connection(); // today's challenge depends on the request date
  const daily = getTodaysBingo();
  const pokedex = getPokedex();
  // The client gets the 16 visible conditions and the FIRST card only — never the rest of the deck.
  const initial = daily.challenge ? playBingo(daily.challenge, [], (id) => pokedex.getById(id)) : null;

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
          POKÉ<span className="text-sun-400">BINGO</span>
        </h1>
        <p className="mt-1 font-semibold">
          PokéBingo <span className="text-ember-300">{formatChallengeNumber(daily.number)}</span>
        </p>
        <p className="text-sm text-mist-dim">{formatDisplayDate(daily.date)}</p>
        <AccentBar className="mt-3" />
      </header>

      <div className="mt-4">
        {daily.challenge && initial?.ok ? (
          <BingoGame
            challengeNumber={daily.number}
            progressKey={daily.progressKey}
            cells={cellViews(daily.challenge)}
            initialState={initial.state}
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
