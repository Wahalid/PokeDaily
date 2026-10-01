import { connection } from "next/server";
import { currentChallengeNumber, formatChallengeNumber, formatDisplayDate, todayKey } from "@/lib/daily/calendar";
import { GAMES } from "@/lib/games/registry";
import { FeaturedGameCard } from "@/features/home/components/FeaturedGameCard";
import { HubHero } from "@/features/home/components/HubHero";
import { UpcomingGameCard } from "@/features/home/components/UpcomingGameCard";

export default async function HomePage() {
  await connection(); // shows today's date and challenge number
  const number = currentChallengeNumber();
  const playable = GAMES.filter((g) => g.status === "playable");
  const upcoming = GAMES.filter((g) => g.status === "coming-soon");

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-8 sm:pt-14 lg:pt-16">
      <HubHero dateLabel={formatDisplayDate(todayKey())} />

      <section aria-label="Play today" className="mt-10 grid gap-4 sm:mt-12">
        {playable.map((game) => (
          <FeaturedGameCard
            key={game.id}
            game={game}
            challengeLabel={`Daily Challenge ${formatChallengeNumber(number)}`}
          />
        ))}
      </section>

      <section aria-labelledby="upcoming-heading" className="mt-10 sm:mt-12">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 id="upcoming-heading" className="text-sm font-bold tracking-[0.15em] text-mist uppercase">
            More games on the way
          </h2>
          <span className="hidden text-xs text-mist-dim sm:inline">{upcoming.length} in development</span>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {upcoming.map((game) => (
            <li key={game.id}>
              <UpcomingGameCard game={game} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
