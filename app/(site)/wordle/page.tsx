import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AccentBar } from "@/components/ui/AccentBar";
import { formatChallengeNumber, formatDisplayDate } from "@/lib/daily/calendar";
import { getTodaysWordle } from "@/lib/server/wordle-service";
import { initialWordleState } from "@/lib/wordle/play";
import { WordleGame } from "@/features/wordle/components/WordleGame";

export const metadata: Metadata = {
  title: "PokéWordle",
  description: "Adivina el Pokémon del día por sus letras en 6 intentos.",
};

export default async function WordlePage() {
  await connection(); // today's secret depends on the request date
  const daily = getTodaysWordle();
  // The client only gets the word length and an opaque progress key — never the secret.

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
          POKÉ<span className="text-sun-400">WORDLE</span>
        </h1>
        <p className="mt-1 font-semibold">Adivina el Pokémon del día</p>
        <p className="text-sm text-mist-dim">
          Reto diario <span className="text-ember-300">{formatChallengeNumber(daily.number)}</span> · {formatDisplayDate(daily.date)}
        </p>
        <AccentBar className="mt-3" />
      </header>

      <div className="mt-4">
        {daily.challenge ? (
          <WordleGame challengeNumber={daily.number} progressKey={daily.progressKey} initialState={initialWordleState(daily.challenge)} />
        ) : (
          <p className="mx-auto max-w-md rounded-2xl border border-ember-500/40 bg-ember-500/10 p-4 text-center font-semibold text-ember-300">
            El juego no está disponible en este momento.
          </p>
        )}
      </div>
    </div>
  );
}
