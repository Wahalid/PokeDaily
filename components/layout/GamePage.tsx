import Link from "next/link";
import type { ReactNode } from "react";
import { formatChallengeNumber, formatDisplayDate, type DateKey } from "@/lib/daily/calendar";

const COPY = {
  en: { back: "Back to Games", daily: "Daily Challenge" },
  es: { back: "Volver a los juegos", daily: "Reto diario" },
} as const;

/** Content widths a game can ask for; the header always uses the site width. */
const WIDTHS = { md: "max-w-3xl", lg: "max-w-4xl" } as const;

/**
 * Shared frame for every game page, styled after the hub hero: back link
 * aligned with the logo, a small uppercase date line, the title with its
 * yellow accent word and an optional one-line subtitle. The game itself
 * renders below, centred in its own width.
 */
export function GamePage({
  lang,
  title,
  accent,
  subtitle,
  number,
  date,
  width = "md",
  children,
}: {
  lang: keyof typeof COPY;
  /** Title in two parts: "POKÉ" + accent "BINGO". */
  title: string;
  accent: string;
  subtitle?: string;
  number: number;
  date: DateKey;
  width?: keyof typeof WIDTHS;
  children: ReactNode;
}) {
  const copy = COPY[lang];
  return (
    <div className="mx-auto max-w-[1124px] px-4 pt-4 pb-10 sm:pt-6">
      <Link
        href="/"
        className="inline-flex min-h-10 items-center gap-1.5 rounded-md text-sm font-semibold text-mist transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400"
      >
        <span aria-hidden>←</span> {copy.back}
      </Link>

      <header className="mt-2 text-center sm:mt-3">
        <p className="-mr-[0.12em] text-xs font-bold tracking-[0.12em] text-lavender uppercase sm:-mr-[0.2em] sm:tracking-[0.2em]">
          {copy.daily} <span className="text-sun-400">{formatChallengeNumber(number)}</span> <span aria-hidden>·</span>{" "}
          {formatDisplayDate(date)}
        </p>
        <h1 className="mt-2 text-3xl leading-[1.05] font-black tracking-tight [text-shadow:0_3px_0_rgb(5_9_22/0.55)] sm:text-4xl">
          {title}
          <span className="text-sun-400">{accent}</span>
        </h1>
        {subtitle && <p className="mx-auto mt-2 max-w-md text-sm text-balance text-mist">{subtitle}</p>}
      </header>

      <div className={`mx-auto mt-6 ${WIDTHS[width]}`}>{children}</div>
    </div>
  );
}
