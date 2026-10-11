import type { Metadata } from "next";
import { connection } from "next/server";
import { GamePage } from "@/components/layout/GamePage";
import { Notice } from "@/components/ui/Notice";
import { getDailyQuartets, publicCards } from "@/lib/server/quartets-service";
import { todayNumber } from "@/lib/server/test-day";
import { QuartetsGame } from "@/features/quartets/components/QuartetsGame";

export const metadata: Metadata = {
  title: "Cuartetos",
  description: "Encuentra los 4 grupos de 4 Pokémon. Un nuevo reto cada día.",
};

export default async function QuartetsPage() {
  await connection(); // today's board depends on the request date
  const daily = getDailyQuartets(await todayNumber());
  // Only the 16 cards (in initial order) and an opaque progress key reach the client — never the groups.
  const cards = publicCards(daily);

  return (
    <GamePage lang="es" title="CUAR" accent="TETOS" subtitle="Encuentra los 4 grupos de 4 Pokémon." number={daily.number} date={daily.date}>
      {cards.length === 16 ? (
        <QuartetsGame challengeNumber={daily.number} progressKey={daily.progressKey} cards={cards} />
      ) : (
        <Notice tone="error">El juego no está disponible en este momento.</Notice>
      )}
    </GamePage>
  );
}
