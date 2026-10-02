import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { GameInfo } from "@/lib/games/registry";

/** Large card for the currently playable daily game. The whole card is the link. */
export function FeaturedGameCard({ game, challengeLabel }: { game: GameInfo; challengeLabel: string }) {
  return (
    <Link
      href={game.href}
      className="group relative block overflow-hidden rounded-3xl border border-brand-500/40 bg-gradient-to-br from-night-700 via-night-800 to-night-800 p-6 shadow-[0_20px_50px_-20px_rgb(8_17_43/0.9)] transition hover:-translate-y-0.5 hover:border-brand-300/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sun-400 sm:p-8"
    >
      {/* soft yellow glow in the corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-sun-400/10 blur-3xl transition group-hover:bg-sun-400/15"
      />

      <div className="relative flex items-center justify-between gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">● Playable</Badge>
            <span className="text-sm font-medium text-mist">{challengeLabel}</span>
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            Pokémon <span className="text-brand-300">{game.name}</span>
          </h2>
          <p className="mt-2 max-w-md text-mist">{game.tagline}</p>
          <span className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sun-400 px-5 py-2.5 text-sm font-bold text-night-950 shadow-[0_6px_20px_-6px_rgb(255_201_40/0.6)] transition group-hover:bg-sun-300">
            Play today&apos;s {game.name}
            <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
          </span>
        </div>

        {game.id === "guess" ? <MiniClues /> : <MiniBoard />}
      </div>
    </Link>
  );
}

/** Decorative feedback rows for "Adivina el Pokémon" (no real answers). */
function MiniClues() {
  const rows = [
    ["bg-ember-500", "bg-emerald-400", "bg-ember-500", "bg-sun-400", "bg-ember-500"],
    ["bg-emerald-400", "bg-emerald-400", "bg-ember-500", "bg-emerald-400", "bg-sun-400"],
    ["bg-emerald-400", "bg-emerald-400", "bg-emerald-400", "bg-emerald-400", "bg-emerald-400"],
  ];
  return (
    <div aria-hidden className="hidden shrink-0 flex-col gap-2 sm:flex">
      {rows.map((row, r) => (
        <div key={r} className="flex items-center gap-1.5">
          <span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-night-950/50 text-sm font-bold text-white/30">
            ?
          </span>
          {row.map((color, i) => (
            <span
              key={i}
              className="grid size-10 place-items-center rounded-lg border border-white/10 bg-night-950/50 transition group-hover:border-white/20"
              style={{ transitionDelay: `${(r * 5 + i) * 20}ms` }}
            >
              <span className={`size-3 rounded-full ${color} opacity-80`} />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Decorative 3×3 preview (no real answers). */
function MiniBoard() {
  const filled: Record<number, string> = { 0: "bg-brand-500", 4: "bg-sun-400", 8: "bg-ember-500", 5: "bg-brand-300" };
  return (
    <div aria-hidden className="hidden shrink-0 grid-cols-3 gap-2 sm:grid">
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className="grid size-14 place-items-center rounded-xl border border-white/10 bg-night-950/50 transition group-hover:border-white/20 lg:size-16"
          style={{ transitionDelay: `${i * 25}ms` }}
        >
          {filled[i] ? (
            <span className={`size-5 rounded-full ${filled[i]} shadow-lg ring-4 ring-white/5`} />
          ) : (
            <span className="text-lg font-bold text-white/20">?</span>
          )}
        </span>
      ))}
    </div>
  );
}
