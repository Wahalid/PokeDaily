import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AccentBar } from "@/components/ui/AccentBar";
import { formatChallengeNumber, formatDisplayDate } from "@/lib/daily/calendar";
import { getTodaysGuess } from "@/lib/server/guess-service";
import { GuessGame } from "@/features/guess/components/GuessGame";

export const metadata: Metadata = {
  title: "Adivina el Pokémon",
  description: "Descubre el Pokémon del día en 8 intentos.",
};

export default async function GuessPage() {
  await connection(); // today's secret depends on the request date
  // Only the challenge number and an opaque progress key reach the client — never the secret.
  const { number, date, progressKey } = getTodaysGuess();

  return (
    <div className="mx-auto max-w-4xl px-4 pt-4 pb-10 sm:pt-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-mist transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400"
      >
        ← Volver a los juegos
      </Link>

      <header className="mt-3 text-center sm:mt-4">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          ADIVINA EL <span className="text-sun-400">POKÉMON</span>
        </h1>
        <p className="mt-2 font-semibold">Descubre el Pokémon del día</p>
        <p className="text-sm text-mist-dim">
          Reto diario <span className="text-ember-300">{formatChallengeNumber(number)}</span> · {formatDisplayDate(date)}
        </p>
        <AccentBar className="mt-4" />
      </header>

      <div className="mt-6">
        <GuessGame challengeNumber={number} progressKey={progressKey} />
      </div>
    </div>
  );
}
