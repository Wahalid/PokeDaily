import type { Metadata } from "next";
import { connection } from "next/server";
import { GamePage } from "@/components/layout/GamePage";
import { Notice } from "@/components/ui/Notice";
import { initialCryState } from "@/lib/cry/play";
import { getPokedex } from "@/lib/pokemon/repository";
import { getDailyCry } from "@/lib/server/cry-service";
import { todayNumber } from "@/lib/server/test-day";
import { CryGame } from "@/features/cry/components/CryGame";

export const metadata: Metadata = {
  title: "PokéCry",
  description: "Escucha 5 cries y adivina qué Pokémon es entre 4 opciones. Un reto nuevo cada día.",
};

export default async function CryPage() {
  await connection(); // today's rounds depend on the request date
  const daily = getDailyCry(await todayNumber());
  const pokedex = getPokedex();
  // The client only gets round 1's four options (no answer); later rounds arrive one at a time after each SUBMIT.

  return (
    <GamePage lang="es" title="POKÉ" accent="CRY" subtitle="¿De quién es este cry?" number={daily.number} date={daily.date}>
      {daily.challenge ? (
        <CryGame challengeNumber={daily.number} progressKey={daily.progressKey} initialState={initialCryState(daily.challenge, (id) => pokedex.getById(id))} />
      ) : (
        <Notice tone="error">El juego no está disponible en este momento.</Notice>
      )}
    </GamePage>
  );
}
