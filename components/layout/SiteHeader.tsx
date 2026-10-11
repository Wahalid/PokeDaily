import Link from "next/link";
import { SiteNav } from "./SiteNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-brand-500/20 bg-night-950/85 text-white backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1124px] items-center justify-between gap-3 px-4 sm:h-[67px]">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sun-400"
        >
          <Logo />
          <span className="text-lg font-black tracking-tight sm:text-xl">
            Poké<span className="text-sun-400">Daily</span>
          </span>
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}

function Logo() {
  return (
    <span
      aria-hidden
      className="relative grid size-7 place-items-center overflow-hidden rounded-full border-2 border-white bg-white transition-transform motion-safe:group-hover:rotate-12"
    >
      <span className="absolute inset-x-0 top-0 h-1/2 bg-ember-500" />
      <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-ink" />
      <span className="relative size-2.5 rounded-full border-2 border-ink bg-white" />
    </span>
  );
}
