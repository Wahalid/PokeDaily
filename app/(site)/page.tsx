import { connection } from "next/server";
import { dateForChallengeNumber, formatDisplayDate } from "@/lib/daily/calendar";
import { GAMES } from "@/lib/games/registry";
import { todayNumber } from "@/lib/server/test-day";
import { GameCard } from "@/features/home/components/GameCard";
import { HomeLandscape } from "@/features/home/components/HomeLandscape";
import { HubHero } from "@/features/home/components/HubHero";

export default async function HomePage() {
  await connection(); // shows today's date
  const number = await todayNumber();
  const playable = GAMES.filter((g) => g.status === "playable");

  return (
    <>
      <HomeLandscape />
      <div className="relative z-10 mx-auto max-w-[1124px] px-4 pt-10 pb-6 sm:pt-12 lg:pt-14">
        <HubHero dateLabel={formatDisplayDate(dateForChallengeNumber(number))} />

        <section
          id="games"
          aria-label="Daily games"
          className="mt-8 grid scroll-mt-24 grid-cols-1 gap-5 min-[560px]:grid-cols-2 sm:mt-10 lg:grid-cols-4"
        >
          {playable.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </section>
      </div>
    </>
  );
}
