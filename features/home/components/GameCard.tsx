import Image from "next/image";
import Link from "next/link";
import type { GameInfo } from "@/lib/games/registry";

/**
 * Hub card for a playable game. The whole card is the link; the yellow button
 * is its visual call to action. Covers are pixel art from `npm run home:art`.
 */
export function GameCard({ game }: { game: GameInfo }) {
  return (
    <Link
      href={game.href}
      className="panel group flex h-full flex-col p-5 transition duration-150 hover:[--panel-border:rgb(143_169_255/0.55)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sun-400 motion-safe:hover:-translate-y-0.5"
    >
      <Image
        src={`/home/covers/${game.id}.png`}
        alt=""
        width={160}
        height={96}
        // Tiny pixel-art PNGs: the optimizer would only blur them.
        unoptimized
        loading="eager"
        className="pixelated aspect-[5/3] w-full rounded-[10px] border border-white/5 bg-night-900"
      />
      <h2 className="mt-4 text-[17px] leading-tight font-bold">{game.name}</h2>
      <p className="mt-1.5 flex-1 text-[13px] leading-snug text-mist">{game.tagline}</p>
      <span className="group/button mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-[11px] bg-sun-400 text-sm font-bold text-night-950 transition-colors hover:bg-sun-300 group-focus-visible:bg-sun-300">
        {game.cta ?? `Play ${game.name}`}
        <span aria-hidden className="transition-transform duration-150 motion-safe:group-hover/button:translate-x-1">
          →
        </span>
      </span>
    </Link>
  );
}
