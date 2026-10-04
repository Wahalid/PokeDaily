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

        {game.id === "guess" ? (
          <MiniClues />
        ) : game.id === "connections" ? (
          <MiniQuartets />
        ) : game.id === "bingo" ? (
          <MiniBingo />
        ) : game.id === "top10" ? (
          <MiniTop10 />
        ) : game.id === "wordle" ? (
          <MiniWordle />
        ) : game.id === "impostor" ? (
          <MiniImpostor />
        ) : game.id === "cry" ? (
          <MiniCry />
        ) : (
          <MiniBoard />
        )}
      </div>
    </Link>
  );
}

/** Decorative cry player: a play button, a waveform and four options (no real answers). */
function MiniCry() {
  const bars = [6, 14, 22, 12, 28, 18, 10, 24, 16, 8, 20, 12];
  return (
    <div aria-hidden className="hidden w-52 shrink-0 flex-col items-center gap-2 sm:flex">
      <div className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-night-950/50 px-2 py-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sun-400 text-sm text-night-950">▶</span>
        <div className="flex h-8 flex-1 items-center gap-0.5">
          {bars.map((h, i) => (
            <span key={i} className="flex-1 rounded-full bg-brand-300/60 transition group-hover:bg-brand-300" style={{ height: h, transitionDelay: `${i * 20}ms` }} />
          ))}
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-9 rounded-lg border-2 ${i === 2 ? "border-emerald-400/60 bg-emerald-500/15" : "border-white/10 bg-night-950/50"} transition group-hover:border-white/25`}
          />
        ))}
      </div>
    </div>
  );
}

/** Decorative PokéImpostor board: a few picked cards and one impostor (no real answers). */
function MiniImpostor() {
  const picked = new Set([0, 2, 3, 6]);
  return (
    <div aria-hidden className="hidden shrink-0 grid-cols-4 gap-1.5 sm:grid">
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          className={`grid size-12 place-items-center rounded-xl border-2 transition group-hover:border-white/25 ${
            i === 5 ? "border-ember-500/70 bg-ember-500/15" : picked.has(i) ? "border-sun-400/70 bg-sun-400/10" : "border-white/10 bg-night-950/50"
          }`}
          style={{ transitionDelay: `${i * 20}ms` }}
        >
          <span className={`text-sm font-black ${i === 5 ? "text-ember-300" : picked.has(i) ? "text-sun-300" : "text-white/20"}`}>
            {i === 5 ? "!" : picked.has(i) ? "✓" : "?"}
          </span>
        </span>
      ))}
    </div>
  );
}

/** Decorative Wordle rows (no real answers). */
function MiniWordle() {
  const rows = [
    ["bg-slate-600/80", "bg-sun-400/80", "bg-slate-600/80", "bg-slate-600/80", "bg-emerald-500/80"],
    ["bg-emerald-500/80", "bg-slate-600/80", "bg-sun-400/80", "bg-emerald-500/80", "bg-emerald-500/80"],
    ["bg-emerald-500/80", "bg-emerald-500/80", "bg-emerald-500/80", "bg-emerald-500/80", "bg-emerald-500/80"],
  ];
  return (
    <div aria-hidden className="hidden shrink-0 flex-col gap-1.5 sm:flex">
      {rows.map((row, r) => (
        <div key={r} className="flex gap-1.5">
          {row.map((color, i) => (
            <span
              key={i}
              className={`size-10 rounded-lg border border-white/10 ${color} transition group-hover:border-white/25`}
              style={{ transitionDelay: `${(r * 5 + i) * 20}ms` }}
            />
          ))}
        </div>
      ))}
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="size-10 rounded-lg border border-dashed border-white/15 bg-night-950/50" />
        ))}
      </div>
    </div>
  );
}

/** Decorative ranking with a few discovered positions (no real answers). */
function MiniTop10() {
  const discovered = new Set([1, 3, 4]);
  return (
    <div aria-hidden className="hidden w-52 shrink-0 flex-col gap-1 sm:flex">
      {[1, 2, 3, 4, 5].map((pos) => (
        <div
          key={pos}
          className={`flex h-8 items-center gap-2 rounded-lg border px-2 transition group-hover:border-white/20 ${
            discovered.has(pos) ? "border-emerald-400/50 bg-emerald-500/15" : "border-dashed border-white/15 bg-night-950/50"
          }`}
          style={{ transitionDelay: `${pos * 25}ms` }}
        >
          <span className={`grid size-5 place-items-center rounded-full text-[10px] font-black ${pos === 1 ? "bg-sun-400 text-night-950" : "bg-night-600 text-mist"}`}>
            {pos}
          </span>
          {discovered.has(pos) ? <span className="h-2 flex-1 rounded-full bg-emerald-400/50" /> : <span className="text-xs text-white/25">?</span>}
        </div>
      ))}
    </div>
  );
}

/** Decorative bingo card with a few marked squares (no real answers). */
function MiniBingo() {
  const marked = new Set([0, 5, 6, 10, 13]);
  return (
    <div aria-hidden className="hidden shrink-0 grid-cols-4 gap-1.5 sm:grid">
      {Array.from({ length: 16 }, (_, i) => (
        <span
          key={i}
          className={`grid size-12 place-items-center rounded-lg border transition group-hover:border-white/20 ${
            marked.has(i) ? "border-emerald-400/50 bg-emerald-500/15" : "border-dashed border-white/15 bg-night-950/50"
          }`}
          style={{ transitionDelay: `${i * 20}ms` }}
        >
          {marked.has(i) && <span className="size-3 rounded-full bg-emerald-400/80" />}
        </span>
      ))}
    </div>
  );
}

/** Decorative 4×4 board with one solved row, for Cuartetos (no real answers). */
function MiniQuartets() {
  return (
    <div aria-hidden className="hidden shrink-0 flex-col gap-1.5 sm:flex">
      <span className="h-9 w-[13.5rem] rounded-lg border border-sun-400/50 bg-sun-400/20" />
      {[0, 1, 2].map((r) => (
        <div key={r} className="flex gap-1.5">
          {[0, 1, 2, 3].map((c) => (
            <span
              key={c}
              className={`size-12 rounded-lg border bg-night-950/50 transition group-hover:border-white/20 ${
                r === 1 && c > 1 ? "border-sun-400/70" : "border-white/10"
              }`}
              style={{ transitionDelay: `${(r * 4 + c) * 20}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
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
