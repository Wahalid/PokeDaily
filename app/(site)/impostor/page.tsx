import type { Metadata } from "next";
import { connection } from "next/server";
import { GamePage } from "@/components/layout/GamePage";
import { Notice } from "@/components/ui/Notice";
import { boardView } from "@/lib/impostor/play";
import { getPokedex } from "@/lib/pokemon/repository";
import { getDailyImpostor } from "@/lib/server/impostor-service";
import { todayNumber } from "@/lib/server/test-day";
import { ImpostorGame } from "@/features/impostor/components/ImpostorGame";

export const metadata: Metadata = {
  title: "PokéImpostor",
  description: "Selecciona todos los Pokémon que cumplen la categoría del día sin caer en los impostores.",
};

export default async function ImpostorPage() {
  await connection(); // today's board depends on the request date
  const daily = getDailyImpostor(await todayNumber());
  const pokedex = getPokedex();
  // The client only gets the visible category and the cards — never which ones are impostors.

  return (
    <GamePage
      lang="es"
      title="POKÉ"
      accent="IMPOSTOR"
      subtitle="Selecciona los Pokémon que cumplen la categoría sin caer en los impostores."
      number={daily.number}
      date={daily.date}
      width="lg"
    >
      {daily.challenge ? (
        <ImpostorGame
          challengeNumber={daily.number}
          progressKey={daily.progressKey}
          board={boardView(daily.challenge, (id) => pokedex.getById(id))}
        />
      ) : (
        <Notice tone="error">El juego no está disponible en este momento.</Notice>
      )}
    </GamePage>
  );
}
