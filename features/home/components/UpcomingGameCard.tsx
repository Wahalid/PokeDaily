import { Badge } from "@/components/ui/Badge";
import type { GameInfo } from "@/lib/games/registry";

const accents: Record<GameInfo["accent"], string> = {
  blue: "bg-brand-500/15 text-brand-300",
  red: "bg-ember-500/15 text-ember-300",
  yellow: "bg-sun-400/15 text-sun-300",
};

/**
 * Card for a game that is part of the platform but not playable yet.
 * Phones: compact row (icon · text · badge). sm+: vertical card.
 */
export function UpcomingGameCard({ game }: { game: GameInfo }) {
  return (
    <article className="flex h-full items-center gap-3 rounded-2xl border border-white/10 bg-night-800/70 p-3.5 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-night-800 sm:flex-col sm:items-stretch sm:gap-0 sm:p-5">
      <div className="flex shrink-0 items-start justify-between gap-2">
        <span aria-hidden className={`grid size-10 place-items-center rounded-xl text-xl font-bold sm:size-11 ${accents[game.accent]}`}>
          {game.icon}
        </span>
        <span className="hidden sm:inline-flex">
          <Badge>Coming soon</Badge>
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold tracking-tight sm:mt-3 sm:text-lg">{game.name}</h3>
        <p className="mt-0.5 line-clamp-2 text-xs text-mist-dim sm:mt-1 sm:text-sm">{game.tagline}</p>
      </div>
      <span className="shrink-0 sm:hidden">
        <Badge>Coming soon</Badge>
      </span>
    </article>
  );
}
