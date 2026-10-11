import type { Metadata } from "next";
import { connection } from "next/server";
import { GamePage } from "@/components/layout/GamePage";
import { Notice } from "@/components/ui/Notice";
import { getDailyWordle } from "@/lib/server/wordle-service";
import { todayNumber } from "@/lib/server/test-day";
import { initialWordleState } from "@/lib/wordle/play";
import { WordleGame } from "@/features/wordle/components/WordleGame";

export const metadata: Metadata = {
  title: "PokéWordle",
  description: "Adivina el Pokémon del día por sus letras en 6 intentos.",
};

export default async function WordlePage() {
  await connection(); // today's secret depends on the request date
  const daily = getDailyWordle(await todayNumber());
  // The client only gets the word length and an opaque progress key — never the secret.

  return (
    <GamePage lang="es" title="POKÉ" accent="WORDLE" subtitle="Adivina el Pokémon del día por sus letras." number={daily.number} date={daily.date}>
      {daily.challenge ? (
        <WordleGame challengeNumber={daily.number} progressKey={daily.progressKey} initialState={initialWordleState(daily.challenge)} />
      ) : (
        <Notice tone="error">El juego no está disponible en este momento.</Notice>
      )}
    </GamePage>
  );
}
