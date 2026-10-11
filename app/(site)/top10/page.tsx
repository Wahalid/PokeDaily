import type { Metadata } from "next";
import { connection } from "next/server";
import { GamePage } from "@/components/layout/GamePage";
import { Notice } from "@/components/ui/Notice";
import { getPokedex } from "@/lib/pokemon/repository";
import { getDailyTop10 } from "@/lib/server/top10-service";
import { todayNumber } from "@/lib/server/test-day";
import { criterionView, initialTop10State } from "@/lib/top10/play";
import { Top10Game } from "@/features/top10/components/Top10Game";

export const metadata: Metadata = {
  title: "Top 10",
  description: "Descubre los 10 Pokémon que encabezan el ranking del día. Un nuevo Top 10 cada día.",
};

export default async function Top10Page() {
  await connection(); // today's challenge depends on the request date
  const daily = getDailyTop10(await todayNumber());
  const pokedex = getPokedex();
  // The client only gets the visible criterion and the type clue of each position — never the ranking.

  return (
    <GamePage
      lang="es"
      title="TOP "
      accent="10"
      subtitle="Descubre los 10 Pokémon que encabezan el ranking del día."
      number={daily.number}
      date={daily.date}
    >
      {daily.challenge ? (
        <Top10Game
          challengeNumber={daily.number}
          progressKey={daily.progressKey}
          criterion={criterionView(daily.challenge)}
          initialState={initialTop10State(daily.challenge, (id) => pokedex.getById(id))}
        />
      ) : (
        <Notice tone="error">El juego no está disponible en este momento.</Notice>
      )}
    </GamePage>
  );
}
