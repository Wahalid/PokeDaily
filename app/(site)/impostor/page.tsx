import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AccentBar } from "@/components/ui/AccentBar";
import { formatChallengeNumber, formatDisplayDate } from "@/lib/daily/calendar";
import { boardView } from "@/lib/impostor/play";
import { getPokedex } from "@/lib/pokemon/repository";
import { getTodaysImpostor } from "@/lib/server/impostor-service";
import { ImpostorGame } from "@/features/impostor/components/ImpostorGame";

export const metadata: Metadata = {
  title: "PokéImpostor",
  description: "Selecciona todos los Pokémon que cumplen la categoría del día sin caer en los impostores.",
};

export default async function ImpostorPage() {
  await connection(); // today's board depends on the request date
  const daily = getTodaysImpostor();
  const pokedex = getPokedex();
  // The client only gets the visible category and the cards — never which ones are impostors.

  return (
    <div className="mx-auto max-w-4xl px-4 pt-4 pb-10 sm:pt-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-mist transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400"
      >
        ← Volver a los juegos
      </Link>

      <header className="mt-2 text-center sm:mt-3">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          POKÉ<span className="text-ember-500">IMPOSTOR</span>
        </h1>
        <p className="text-sm text-mist-dim">
          Reto diario <span className="text-ember-300">{formatChallengeNumber(daily.number)}</span> · {formatDisplayDate(daily.date)}
        </p>
        <AccentBar className="mt-3" />
      </header>

      <div className="mt-4">
        {daily.challenge ? (
          <ImpostorGame
            challengeNumber={daily.number}
            progressKey={daily.progressKey}
            board={boardView(daily.challenge, (id) => pokedex.getById(id))}
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
