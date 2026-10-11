import type { Metadata } from "next";
import { connection } from "next/server";
import { GamePage } from "@/components/layout/GamePage";
import { Notice } from "@/components/ui/Notice";
import { cellViews, playBingo } from "@/lib/bingo/play";
import { getBingoData, getDailyBingo } from "@/lib/server/bingo-service";
import { todayNumber } from "@/lib/server/test-day";
import { BingoGame } from "@/features/bingo/components/BingoGame";

export const metadata: Metadata = {
  title: "PokéBingo",
  description: "Coloca cada Pokémon en la casilla correcta y completa el tablero. Un nuevo PokéBingo cada día.",
};

export default async function BingoPage() {
  await connection(); // today's challenge depends on the request date
  const daily = getDailyBingo(await todayNumber());
  // The client gets the 16 visible conditions and the FIRST card only — never the cards to come.
  const initial = daily.challenge ? playBingo(daily.challenge, [], getBingoData()) : null;

  return (
    <GamePage
      lang="es"
      title="POKÉ"
      accent="BINGO"
      subtitle="Coloca cada Pokémon en la casilla correcta y completa el tablero."
      number={daily.number}
      date={daily.date}
    >
      {daily.challenge && initial?.ok ? (
        <BingoGame
          challengeNumber={daily.number}
          progressKey={daily.progressKey}
          cells={cellViews(daily.challenge)}
          initialState={initial.state}
        />
      ) : (
        <Notice tone="error">El juego no está disponible en este momento.</Notice>
      )}
    </GamePage>
  );
}
