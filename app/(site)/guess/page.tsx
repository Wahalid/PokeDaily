import type { Metadata } from "next";
import { connection } from "next/server";
import { GamePage } from "@/components/layout/GamePage";
import { getDailyGuess } from "@/lib/server/guess-service";
import { todayNumber } from "@/lib/server/test-day";
import { GuessGame } from "@/features/guess/components/GuessGame";

export const metadata: Metadata = {
  title: "Adivina el Pokémon",
  description: "Descubre el Pokémon del día en 8 intentos.",
};

export default async function GuessPage() {
  await connection(); // today's secret depends on the request date
  // Only the challenge number and an opaque progress key reach the client — never the secret.
  const { number, date, progressKey } = getDailyGuess(await todayNumber());

  return (
    <GamePage lang="es" title="ADIVINA EL " accent="POKÉMON" subtitle="Descubre el Pokémon del día." number={number} date={date} width="lg">
      <GuessGame challengeNumber={number} progressKey={progressKey} />
    </GamePage>
  );
}
