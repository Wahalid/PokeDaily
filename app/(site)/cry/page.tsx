import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AccentBar } from "@/components/ui/AccentBar";
import { initialCryState } from "@/lib/cry/play";
import { formatChallengeNumber, formatDisplayDate } from "@/lib/daily/calendar";
import { getPokedex } from "@/lib/pokemon/repository";
import { getTodaysCry } from "@/lib/server/cry-service";
import { CryGame } from "@/features/cry/components/CryGame";

export const metadata: Metadata = {
  title: "PokéCry",
  description: "Escucha 5 cries y adivina qué Pokémon es entre 4 opciones. Un reto nuevo cada día.",
};

export default async function CryPage() {
  await connection(); // today's rounds depend on the request date
  const daily = getTodaysCry();
  const pokedex = getPokedex();
  // The client only gets round 1's four options (no answer); later rounds arrive one at a time after each SUBMIT.

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
          POKÉ<span className="text-brand-300">CRY</span>
        </h1>
        <p className="mt-1 font-semibold">¿De quién es este cry?</p>
        <p className="text-sm text-mist-dim">
          Reto diario <span className="text-ember-300">{formatChallengeNumber(daily.number)}</span> · {formatDisplayDate(daily.date)}
        </p>
        <AccentBar className="mt-3" />
      </header>

      <div className="mt-4">
        {daily.challenge ? (
          <CryGame challengeNumber={daily.number} progressKey={daily.progressKey} initialState={initialCryState(daily.challenge, (id) => pokedex.getById(id))} />
        ) : (
          <p className="mx-auto max-w-md rounded-2xl border border-ember-500/40 bg-ember-500/10 p-4 text-center font-semibold text-ember-300">
            El juego no está disponible en este momento.
          </p>
        )}
      </div>
    </div>
  );
}
